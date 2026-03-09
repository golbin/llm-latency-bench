import { BASE_MODELS } from "./models.ts";
import type { CacheMode, Command, ModelSpec, Provider, RunOptions, Suite } from "./types.ts";

export const DEFAULT_ENV_FILE = ".env";
export const DEFAULT_OUT_DIR = "./results";
export const DEFAULT_ITERATIONS = 5;
export const DEFAULT_WARMUPS = 1;

export function parseArgs(args: string[]): RunOptions {
  const command = parseCommand(args[0]);
  const flags = new Map<string, string>();

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inline] = arg.slice(2).split("=", 2);
    const next = inline ?? args[i + 1];
    if (inline === undefined && args[i + 1] && !args[i + 1].startsWith("--")) {
      i += 1;
    }
    flags.set(key, next ?? "true");
  }

  const providers = parseProviders(flags.get("providers"));
  return {
    envFile: parseEnvFile(flags.get("env-file")),
    outDir: flags.get("out-dir") ?? DEFAULT_OUT_DIR,
    command,
    iterations: parsePositiveInt(flags.get("iterations")) ?? DEFAULT_ITERATIONS,
    warmups: parsePositiveInt(flags.get("warmups")) ?? DEFAULT_WARMUPS,
    includeMiniProbe: (flags.get("probe-mini") ?? "true") !== "false",
    models: parseModelList(flags.get("models"), providers),
    providers,
    suite: parseSuite(flags.get("suite")),
    cacheMode: parseCacheMode(flags.get("cache-mode")),
  };
}

function parseCommand(value?: string): Command {
  if (value === "probe" || value === "run") {
    return value;
  }
  throw new Error(
    "Usage: deno task <probe|run> [--providers openai,anthropic,gemini] [--suite smoke|input-latency|output-latency|full]",
  );
}

function parsePositiveInt(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseProviders(value?: string): Provider[] {
  if (!value) {
    return ["openai", "anthropic", "gemini"];
  }

  const providers = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is Provider =>
      item === "openai" || item === "anthropic" || item === "gemini"
    );
  return providers.length > 0 ? providers : ["openai", "anthropic", "gemini"];
}

function parseModelList(value: string | undefined, providers: Provider[]): ModelSpec[] {
  const allowedProviders = new Set(providers);
  const all = BASE_MODELS
    .filter((model) => allowedProviders.has(model.provider))
    .map((model) => ({ ...model }));

  if (!value) {
    return all;
  }

  const wanted = new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
  return all.filter((entry) => wanted.has(entry.model));
}

function parseSuite(value?: string): Suite {
  if (
    value === "smoke" ||
    value === "input-latency" ||
    value === "output-latency" ||
    value === "full"
  ) {
    return value;
  }
  return "smoke";
}

function parseCacheMode(value?: string): CacheMode {
  if (value === "warm" || value === "cold") {
    return value;
  }
  return "cold";
}

function parseEnvFile(value?: string): string | null {
  if (!value) {
    return DEFAULT_ENV_FILE;
  }
  if (value === "none") {
    return null;
  }
  return value;
}
