import type { PromptSpec, Suite } from "./types.ts";

export function buildPrompts(suite: Suite): PromptSpec[] {
  switch (suite) {
    case "input-latency":
      return buildInputLatencyPrompts();
    case "output-latency":
      return buildOutputLatencyPrompts();
    case "full":
      return [...buildInputLatencyPrompts(), ...buildOutputLatencyPrompts()];
    case "smoke":
    default:
      return buildSmokePrompts();
  }
}

export function buildSmokePrompts(): PromptSpec[] {
  return [
    {
      id: "short-qna",
      prompt:
        "Return exactly one ASCII sentence describing why latency benchmarks must control for cache effects.",
      maxOutputTokens: 256,
    },
    {
      id: "structured",
      prompt:
        "Return valid JSON with keys `goal`, `control`, and `risk`. Each value must be a short ASCII string about API latency benchmarking.",
      maxOutputTokens: 320,
    },
  ];
}

function buildInputLatencyPrompts(): PromptSpec[] {
  const sizes = [200, 4000, 32000, 128000, 256000];
  return sizes.map((size) => ({
    id: `input-${size}`,
    prompt: makeSizedPrompt(
      size,
      "Summarize the benchmark control variables in one short ASCII sentence.",
    ),
    maxOutputTokens: 48,
  }));
}

function buildOutputLatencyPrompts(): PromptSpec[] {
  const outputs = [16, 128, 512];
  return outputs.map((tokens) => ({
    id: `output-${tokens}`,
    prompt: makeSizedPrompt(
      200,
      `Write about API latency benchmarking in plain ASCII. Target about ${tokens} tokens.`,
    ),
    maxOutputTokens: tokens,
  }));
}

function makeSizedPrompt(targetChars: number, instruction: string): string {
  const seed =
    "Latency benchmarking requires controlled prompts, fixed decoding settings, stable tiers, and explicit cache policy. ";
  let prompt = `${instruction}\n\nContext:\n`;
  while (prompt.length < targetChars) {
    prompt += seed;
  }
  return prompt.slice(0, targetChars);
}
