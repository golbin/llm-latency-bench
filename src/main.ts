import { DEFAULT_OUT_DIR, parseArgs } from "./config.ts";
import { ensureDir, loadEnvMap, loadKeys } from "./env.ts";
import { buildPrompts } from "./prompts.ts";
import { dispatchRequest } from "./providers.ts";
import { printSummary, writeResults } from "./results.ts";
import type {
  AttemptResult,
  GenericRequestParams,
  Keys,
  ModelSpec,
  PromptSpec,
  RunOptions,
} from "./types.ts";

async function main() {
  const options = parseArgs(Deno.args);
  await ensureDir(options.outDir ?? DEFAULT_OUT_DIR);

  const envMap = await loadEnvMap(options.envFile);
  const keys = loadKeys(envMap);
  const prompts = buildPrompts(options.suite);
  const selectedModels = options.models.filter((entry) => entry.include);

  if (options.command === "probe") {
    const results = await runProbe(keys, options, selectedModels, prompts);
    await finalizeRun(options.outDir, "probe", results);
    return;
  }

  const results = await runBenchmark(keys, options, selectedModels, prompts);
  await finalizeRun(options.outDir, "run", results);
}

async function finalizeRun(outDir: string, prefix: "probe" | "run", results: AttemptResult[]) {
  const stamp = timestampSlug();
  await writeResults(outDir, `${prefix}-${stamp}`, results);
  printSummary(results, prefix);
}

async function runProbe(
  keys: Keys,
  options: RunOptions,
  models: ModelSpec[],
  prompts: PromptSpec[],
): Promise<AttemptResult[]> {
  const results: AttemptResult[] = [];
  for (const model of models) {
    for (const tier of model.tiers) {
      for (const variant of model.supportsVariants) {
        results.push(
          await makeAttempt(keys, {
            modelSpec: model,
            prompt: prompts[0],
            tier,
            variant,
            phase: "probe",
            attempt: 1,
            cacheMode: options.cacheMode,
          }),
        );
      }
    }
  }
  return results;
}

async function runBenchmark(
  keys: Keys,
  options: RunOptions,
  models: ModelSpec[],
  prompts: PromptSpec[],
): Promise<AttemptResult[]> {
  const results: AttemptResult[] = [];
  for (const model of models) {
    for (const tier of model.tiers) {
      for (const variant of model.supportsVariants) {
        for (const prompt of prompts) {
          for (let attempt = 1; attempt <= options.warmups; attempt += 1) {
            results.push(
              await makeAttempt(keys, {
                modelSpec: model,
                prompt,
                tier,
                variant,
                phase: "warmup",
                attempt,
                cacheMode: options.cacheMode,
              }),
            );
          }
          for (let attempt = 1; attempt <= options.iterations; attempt += 1) {
            results.push(
              await makeAttempt(keys, {
                modelSpec: model,
                prompt,
                tier,
                variant,
                phase: "measure",
                attempt,
                cacheMode: options.cacheMode,
              }),
            );
          }
        }
      }
    }
  }
  return results;
}

async function makeAttempt(keys: Keys, params: GenericRequestParams): Promise<AttemptResult> {
  const timestamp = new Date().toISOString();
  const inputPrompt = buildInputPrompt(params.prompt, params.cacheMode);
  const response = await dispatchRequest(keys, params, inputPrompt);

  return {
    ok: response.ok,
    provider: params.modelSpec.provider,
    phase: params.phase,
    model: params.modelSpec.model,
    tier: params.tier,
    variant: params.variant,
    promptId: params.prompt.id,
    attempt: params.attempt,
    timestamp,
    wallMs: response.wallMs,
    ttftMs: response.ttftMs,
    processingMs: response.processingMs,
    requestId: response.requestId,
    responseId: response.responseId,
    responseModel: response.responseModel,
    responseTier: response.responseTier,
    outputTextChars: response.outputText.length,
    inputChars: inputPrompt.length,
    outputTokens: response.outputTokens,
    error: response.error,
  };
}

function buildInputPrompt(prompt: PromptSpec, cacheMode: RunOptions["cacheMode"]): string {
  if (cacheMode === "warm") {
    return prompt.prompt;
  }
  return `${prompt.prompt}\n\nnonce=${crypto.randomUUID()}`;
}

function timestampSlug(): string {
  return new Date().toISOString().replaceAll(":", "").replaceAll(".", "").replace("T", "-").replace(
    "Z",
    "Z",
  );
}

if (import.meta.main) {
  await main();
}
