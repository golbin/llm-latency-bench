import { compactError, parseHeaderNumber, roundMs } from "./results.ts";
import type { GenericRequestParams, Keys, ProviderResponse, SseParseResult } from "./types.ts";

const REQUEST_TIMEOUT_MS = 30_000;
let vertexTokenCache: { token: string; expiresAtMs: number } | null = null;

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
      if (params.modelSpec.geminiBackend === "vertex") {
        return await makeVertexGeminiRequest(keys, params, inputPrompt);
      }
      return await makeGeminiRequest(keys.google, params, inputPrompt);
    case "upstage":
      return await makeUpstageRequest(keys.upstage, params, inputPrompt);
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
    if (stream.streamError) {
      return providerFailure(started, requestId, processingMs, stream.streamError);
    }

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
    if (stream.streamError) {
      return providerFailure(started, requestId, null, stream.streamError);
    }

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
    if (stream.streamError) {
      return providerFailure(started, requestId, null, stream.streamError);
    }

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

async function makeVertexGeminiRequest(
  keys: Keys,
  params: GenericRequestParams,
  inputPrompt: string,
): Promise<ProviderResponse> {
  if (!keys.vertexProject || !keys.vertexLocation || !keys.vertexServiceAccount) {
    return missingKeyResult(
      "VERTEX_AI_PROJECT, VERTEX_AI_LOCATION, or VERTEX_AI_SERVICE_ACCOUNT",
    );
  }

  const started = performance.now();
  try {
    const accessToken = await getVertexAccessToken(keys.vertexServiceAccount);
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: params.prompt.maxOutputTokens,
    };
    if (params.variant === "thinking-low") {
      generationConfig.thinkingConfig = { thinkingLevel: "LOW" };
    } else if (params.variant === "thinking-minimal") {
      generationConfig.thinkingConfig = { thinkingLevel: "MINIMAL" };
    } else if (params.variant === "thinking-off") {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }
    const body = {
      contents: [{ role: "user", parts: [{ text: inputPrompt }] }],
      generationConfig,
    };
    const baseUrl = keys.vertexLocation === "global"
      ? "https://aiplatform.googleapis.com"
      : `https://${keys.vertexLocation}-aiplatform.googleapis.com`;
    const modelPath = [
      "v1",
      "projects",
      encodeURIComponent(keys.vertexProject),
      "locations",
      encodeURIComponent(keys.vertexLocation),
      "publishers/google/models",
      encodeURIComponent(params.modelSpec.model),
    ].join("/");
    const response = await fetchWithRetry(
      `${baseUrl}/${modelPath}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
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
    if (stream.streamError) {
      return providerFailure(started, requestId, null, stream.streamError);
    }
    return {
      ok: true,
      wallMs: roundMs(performance.now() - started),
      ttftMs: stream.ttftMs,
      processingMs: null,
      requestId,
      responseId: stream.responseId,
      responseModel: stream.responseModel,
      responseTier: null,
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

async function makeUpstageRequest(
  apiKey: string | null,
  params: GenericRequestParams,
  inputPrompt: string,
): Promise<ProviderResponse> {
  if (!apiKey) {
    return missingKeyResult("UPSTAGE_API_KEY");
  }

  const started = performance.now();
  try {
    const response = await fetchWithRetry("https://api.upstage.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.modelSpec.model,
        messages: [{ role: "user", content: inputPrompt }],
        max_tokens: params.prompt.maxOutputTokens,
        reasoning_effort: params.modelSpec.upstageReasoningEffort,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });
    const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id");
    if (!response.ok) {
      return providerFailure(started, requestId, null, await response.text());
    }

    const stream = await parseSseResponse(
      response,
      started,
      readOpenAiCompatibleEvent,
      extractOpenAiCompatibleTextDelta,
    );
    if (stream.streamError) {
      return providerFailure(started, requestId, null, stream.streamError);
    }
    return {
      ok: true,
      wallMs: roundMs(performance.now() - started),
      ttftMs: stream.ttftMs,
      processingMs: null,
      requestId,
      responseId: stream.responseId,
      responseModel: stream.responseModel,
      responseTier: null,
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
      streamError: null,
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

      const streamError = extractStreamError(parsed.event, payload);
      if (streamError) {
        return {
          text,
          ttftMs,
          responseId,
          responseModel,
          responseTier,
          outputTokens,
          streamError,
        };
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
    streamError: null,
  };
}

function extractStreamError(event: string | null, payload: Record<string, unknown>): string | null {
  if (!payload.error && event !== "error" && event !== "response.failed") {
    return null;
  }

  const response = payload.response && typeof payload.response === "object"
    ? payload.response as Record<string, unknown>
    : null;
  const errorObj = (response?.error ?? payload.error) as Record<string, unknown> | null;

  if (errorObj && typeof errorObj === "object") {
    const message = typeof errorObj.message === "string" ? errorObj.message : null;
    const code = typeof errorObj.code === "string" ? errorObj.code : null;
    if (message && code) {
      return `${code}: ${message}`;
    }
    return message ?? JSON.stringify(errorObj);
  }

  return null;
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

function readOpenAiCompatibleEvent(event: Record<string, unknown>): Partial<SseParseResult> {
  const usage = event.usage && typeof event.usage === "object"
    ? event.usage as Record<string, unknown>
    : null;
  return {
    responseId: typeof event.id === "string" ? event.id : null,
    responseModel: typeof event.model === "string" ? event.model : null,
    outputTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
  };
}

function extractOpenAiCompatibleTextDelta(event: Record<string, unknown>): string {
  const choices = Array.isArray(event.choices) ? event.choices : [];
  const first = choices[0] && typeof choices[0] === "object"
    ? choices[0] as Record<string, unknown>
    : null;
  const delta = first?.delta && typeof first.delta === "object"
    ? first.delta as Record<string, unknown>
    : null;
  return typeof delta?.content === "string" ? delta.content : "";
}

async function getVertexAccessToken(serviceAccountJson: string): Promise<string> {
  if (vertexTokenCache && vertexTokenCache.expiresAtMs > Date.now() + 60_000) {
    return vertexTokenCache.token;
  }

  const credentials = JSON.parse(serviceAccountJson) as Record<string, unknown>;
  const clientEmail = typeof credentials.client_email === "string"
    ? credentials.client_email
    : null;
  const privateKey = typeof credentials.private_key === "string" ? credentials.private_key : null;
  const tokenUri = typeof credentials.token_uri === "string"
    ? credentials.token_uri
    : "https://oauth2.googleapis.com/token";
  if (!clientEmail || !privateKey) {
    throw new Error("VERTEX_AI_SERVICE_ACCOUNT lacks client_email or private_key");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const claims = base64UrlJson({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  });
  const signingInput = `${header}.${claims}`;
  const keyData = pemToBytes(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`;
  const tokenResponse = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Vertex OAuth failed: ${compactError(await tokenResponse.text())}`);
  }
  const tokenPayload = await tokenResponse.json() as Record<string, unknown>;
  if (typeof tokenPayload.access_token !== "string") {
    throw new Error("Vertex OAuth response lacks access_token");
  }
  const expiresIn = typeof tokenPayload.expires_in === "number" ? tokenPayload.expires_in : 3600;
  vertexTokenCache = {
    token: tokenPayload.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  };
  return vertexTokenCache.token;
}

function pemToBytes(pem: string): ArrayBuffer {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replaceAll(/\s/g, "");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer;
}

function base64UrlJson(value: Record<string, unknown>): string {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
