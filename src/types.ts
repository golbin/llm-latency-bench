export type Command = "probe" | "run";
export type Provider = "openai" | "anthropic" | "gemini";
export type Suite = "smoke" | "input-latency" | "output-latency" | "full";
export type CacheMode = "cold" | "warm";
export type Variant = "baseline" | "low-effort" | "thinking-off";

export type ModelSpec = {
  provider: Provider;
  model: string;
  include: boolean;
  supportsVariants: Variant[];
  tiers: string[];
  notes?: string;
  openAiFamily?: "non_reasoning" | "gpt5_reasoning";
};

export type PromptSpec = {
  id: string;
  prompt: string;
  maxOutputTokens: number;
};

export type RunOptions = {
  envFile: string | null;
  outDir: string;
  command: Command;
  iterations: number;
  warmups: number;
  includeMiniProbe: boolean;
  models: ModelSpec[];
  providers: Provider[];
  suite: Suite;
  cacheMode: CacheMode;
};

export type AttemptResult = {
  ok: boolean;
  provider: Provider;
  phase: "warmup" | "measure" | "probe";
  model: string;
  tier: string;
  variant: Variant;
  promptId: string;
  attempt: number;
  timestamp: string;
  wallMs: number;
  ttftMs: number | null;
  processingMs: number | null;
  requestId: string | null;
  responseId: string | null;
  responseModel: string | null;
  responseTier: string | null;
  outputTextChars: number;
  inputChars: number;
  outputTokens: number | null;
  error: string | null;
};

export type Keys = {
  anthropic: string | null;
  google: string | null;
  openai: string | null;
};

export type GenericRequestParams = {
  modelSpec: ModelSpec;
  prompt: PromptSpec;
  tier: string;
  variant: Variant;
  phase: "warmup" | "measure" | "probe";
  attempt: number;
  cacheMode: CacheMode;
};

export type ProviderResponse = {
  ok: boolean;
  wallMs: number;
  ttftMs: number | null;
  processingMs: number | null;
  requestId: string | null;
  responseId: string | null;
  responseModel: string | null;
  responseTier: string | null;
  outputText: string;
  outputTokens: number | null;
  error: string | null;
};

export type SseParseResult = {
  text: string;
  ttftMs: number | null;
  responseId: string | null;
  responseModel: string | null;
  responseTier: string | null;
  outputTokens: number | null;
};
