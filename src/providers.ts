import { compactError, parseHeaderNumber, roundMs } from "./results.ts";
import type { GenericRequestParams, Keys, ProviderResponse, SseParseResult } from "./types.ts";

const REQUEST_TIMEOUT_MS = 30_000;

export async function dispatchRequest(
  keys: Keys,
  params: GenericRequestParams,
  inputPrompt: string,
): Promise<ProviderResponse> {
  switch (params.modelSpec.provider) {
    case "openai":
      return await makeOpenAiRequest(keys.openai, params, inputPrompt);
    case "anthropic":
      return await makeAnthropicRequest(keys.anthropic, params, inputPrompt);
    case "gemini":
      return await makeGeminiRequest(keys.google, params, inputPrompt);
  }
}

function missingKeyResult(keyName: string): ProviderResponse {
  return {
    ok: false,
    wallMs: 0,
    ttftMs: null,
    processingMs: null,
    requestId: null,
    responseId: null,
    responseModel: null,
    responseTier: null,
    outputText: "",
    outputTokens: null,
    error: `${keyName} is missing`,
  };
}

function providerFailure(
  started: number,
  requestId: string | null,
  processingMs: number | null,
  errorText: string,
): ProviderResponse {
  return {
    ok: false,
    wallMs: roundMs(performance.now() - started),
    ttftMs: null,
    processingMs,
    requestId,
    responseId: null,
    responseModel: null,
    responseTier: null,
    outputText: "",
    outputTokens: null,
    error: compactError(errorText),
  };
}

async function makeOpenAiRequest(
  apiKey: string | null,
  params: GenericRequestParams,
  inputPrompt: string,
): Promise<ProviderResponse> {
  if (!apiKey) {
    return missingKeyResult("OPENAI_API_KEY");
  }

  const started = performance.now();
  try {
    const body: Record<string, unknown> = {
      model: params.modelSpec.model,
      service_tier: params.tier,
      stream: true,
      max_output_tokens: params.prompt.maxOutputTokens,
      input: inputPrompt,
      text: {
        format: {
          type: "text",
        },
      },
    };

    if (params.modelSpec.openAiReasoningEffort) {
      body.reasoning = { effort: params.modelSpec.openAiReasoningEffort };
    }

    const response = await fetchWithRetry("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const requestId = response.headers.get("x-request-id");
    const processingMs = parseHeaderNumber(response.headers.get("openai-processing-ms"));

    if (!response.ok) {
      return providerFailure(started, requestId, processingMs, await response.text());
    }

    const stream = await parseSseResponse(
      response,
      started,
      readOpenAiEvent,
      extractOpenAiTextDelta,
    );

    return {
      ok: true,
      wallMs: roundMs(performance.now() - started),
      ttftMs: stream.ttftMs,
      processingMs,
      requestId,
      responseId: stream.responseId,
      responseModel: stream.responseModel,
      responseTier: stream.responseTier,
      outputText: stream.text,
      outputTokens: stream.outputTokens,
      error: null,
    };
  } catch (error) {
    return providerFailure(
      started,
      null,
      null,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function makeAnthropicRequest(
  apiKey: string | null,
  params: GenericRequestParams,
  inputPrompt: string,
): Promise<ProviderResponse> {
  if (!apiKey) {
    return missingKeyResult("ANTHROPIC_API_KEY");
  }

  const started = performance.now();
  try {
    const body: Record<string, unknown> = {
      model: params.modelSpec.model,
      max_tokens: params.prompt.maxOutputTokens,
      stream: true,
      service_tier: params.tier,
      messages: [
        {
          role: "user",
          content: inputPrompt,
        },
      ],
    };

    if (params.variant === "low-effort") {
      body.output_config = { effort: "low" };
    }

    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const requestId = response.headers.get("request-id") ?? response.headers.get("x-request-id");
    if (!response.ok) {
      return providerFailure(started, requestId, null, await response.text());
    }

    const stream = await parseSseResponse(
      response,
      started,
      readAnthropicEvent,
      extractAnthropicTextDelta,
    );

    return {
      ok: true,
      wallMs: roundMs(performance.now() - started),
      ttftMs: stream.ttftMs,
      processingMs: null,
      requestId,
      responseId: stream.responseId,
      responseModel: stream.responseModel,
      responseTier: stream.responseTier,
      outputText: stream.text,
      outputTokens: stream.outputTokens,
      error: null,
    };
  } catch (error) {
    return providerFailure(
      started,
      null,
      null,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function makeGeminiRequest(
  apiKey: string | null,
  params: GenericRequestParams,
  inputPrompt: string,
): Promise<ProviderResponse> {
  if (!apiKey) {
    return missingKeyResult("GOOGLE_API_KEY");
  }

  const started = performance.now();
  try {
    const body: Record<string, unknown> = {
      contents: [
        {
          parts: [
            {
              text: inputPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: params.prompt.maxOutputTokens,
      },
    };

    if (params.variant === "thinking-off") {
      (body.generationConfig as Record<string, unknown>).thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${params.modelSpec.model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id");
    if (!response.ok) {
      return providerFailure(started, requestId, null, await response.text());
    }

    const stream = await parseSseResponse(
      response,
      started,
      readGeminiEvent,
      extractGeminiTextDelta,
    );

    return {
      ok: true,
      wallMs: roundMs(performance.now() - started),
      ttftMs: stream.ttftMs,
      processingMs: null,
      requestId,
      responseId: stream.responseId,
      responseModel: stream.responseModel,
      responseTier: stream.responseTier,
      outputText: stream.text,
      outputTokens: stream.outputTokens,
      error: null,
    };
  } catch (error) {
    return providerFailure(
      started,
      null,
      null,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!shouldRetry(response.status) || attempt === retries) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === retries) {
        throw lastError;
      }
    }
    await delay(250 * (attempt + 1));
  }

  if (lastResponse) {
    return lastResponse;
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error("Unreachable retry state");
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseSseResponse(
  response: Response,
  started: number,
  readEvent: (event: Record<string, unknown>) => Partial<SseParseResult>,
  readTextDelta: (event: Record<string, unknown>) => string,
): Promise<SseParseResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    return {
      text: "",
      ttftMs: null,
      responseId: null,
      responseModel: null,
      responseTier: null,
      outputTokens: null,
    };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let ttftMs: number | null = null;
  let responseId: string | null = null;
  let responseModel: string | null = null;
  let responseTier: string | null = null;
  let outputTokens: number | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");

    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary === -1) {
        break;
      }

      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseSseEvent(rawEvent);
      if (!parsed || parsed.data === "[DONE]") {
        continue;
      }

      const payload = tryJson(parsed.data);
      if (!payload) {
        continue;
      }

      const meta = readEvent(payload);
      responseId = typeof meta.responseId === "string" ? meta.responseId : responseId;
      responseModel = typeof meta.responseModel === "string" ? meta.responseModel : responseModel;
      responseTier = typeof meta.responseTier === "string" ? meta.responseTier : responseTier;
      outputTokens = typeof meta.outputTokens === "number" ? meta.outputTokens : outputTokens;

      const delta = readTextDelta(payload);
      if (!delta) {
        continue;
      }

      if (ttftMs === null) {
        ttftMs = roundMs(performance.now() - started);
      }
      text += delta;
    }
  }

  return {
    text,
    ttftMs,
    responseId,
    responseModel,
    responseTier,
    outputTokens,
  };
}

function parseSseEvent(rawEvent: string): { event: string | null; data: string } | null {
  let event: string | null = null;
  const dataLines: string[] = [];

  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return { event, data: dataLines.join("\n") };
}

function tryJson(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function readOpenAiEvent(event: Record<string, unknown>): Partial<SseParseResult> {
  const responseObject = event.response && typeof event.response === "object"
    ? event.response as Record<string, unknown>
    : null;
  const usage = responseObject?.usage && typeof responseObject.usage === "object"
    ? responseObject.usage as Record<string, unknown>
    : null;

  return {
    responseId: typeof responseObject?.id === "string" ? responseObject.id : null,
    responseModel: typeof responseObject?.model === "string" ? responseObject.model : null,
    responseTier: typeof responseObject?.service_tier === "string"
      ? responseObject.service_tier
      : null,
    outputTokens: typeof usage?.output_tokens === "number" ? usage.output_tokens : null,
  };
}

function extractOpenAiTextDelta(event: Record<string, unknown>): string {
  if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
    return event.delta;
  }
  if (typeof event.output_text === "string") {
    return event.output_text;
  }
  return "";
}

function readAnthropicEvent(event: Record<string, unknown>): Partial<SseParseResult> {
  const message = event.message && typeof event.message === "object"
    ? event.message as Record<string, unknown>
    : null;
  const usage = message?.usage && typeof message.usage === "object"
    ? message.usage as Record<string, unknown>
    : event.usage && typeof event.usage === "object"
    ? event.usage as Record<string, unknown>
    : null;

  return {
    responseId: typeof message?.id === "string" ? message.id : null,
    responseModel: typeof message?.model === "string" ? message.model : null,
    responseTier: typeof usage?.service_tier === "string" ? usage.service_tier : null,
    outputTokens: typeof usage?.output_tokens === "number" ? usage.output_tokens : null,
  };
}

function extractAnthropicTextDelta(event: Record<string, unknown>): string {
  if (event.type !== "content_block_delta") {
    return "";
  }

  const delta = event.delta && typeof event.delta === "object"
    ? event.delta as Record<string, unknown>
    : null;
  return delta && delta.type === "text_delta" && typeof delta.text === "string" ? delta.text : "";
}

function readGeminiEvent(event: Record<string, unknown>): Partial<SseParseResult> {
  const usage = event.usageMetadata && typeof event.usageMetadata === "object"
    ? event.usageMetadata as Record<string, unknown>
    : null;

  return {
    responseId: typeof event.responseId === "string" ? event.responseId : null,
    responseModel: typeof event.modelVersion === "string" ? event.modelVersion : null,
    outputTokens: typeof usage?.candidatesTokenCount === "number"
      ? usage.candidatesTokenCount
      : null,
  };
}

function extractGeminiTextDelta(event: Record<string, unknown>): string {
  const candidates = Array.isArray(event.candidates) ? event.candidates : [];
  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") {
        return [];
      }
      const content = (candidate as Record<string, unknown>).content;
      if (!content || typeof content !== "object") {
        return [];
      }
      return Array.isArray((content as Record<string, unknown>).parts)
        ? (content as Record<string, unknown>).parts as unknown[]
        : [];
    })
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const text = (part as Record<string, unknown>).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}
