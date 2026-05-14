import type { AttemptResult } from "./types.ts";

async function main() {
  const { inputPath, outputPath } = parseArgs(Deno.args);
  const results = await readResults(inputPath);
  const markdown = buildSmokeReport(results);
  await Deno.writeTextFile(outputPath, markdown);
  console.log(`Wrote ${outputPath}`);
}

function parseArgs(args: string[]) {
  const [inputPath, outputPath] = args;
  if (!inputPath || !outputPath) {
    throw new Error(
      "Usage: deno run --allow-read --allow-write src/report.ts <input.json> <output.md>",
    );
  }
  return { inputPath, outputPath };
}

async function readResults(path: string): Promise<AttemptResult[]> {
  const raw = await Deno.readTextFile(path);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of AttemptResult objects");
  }
  return parsed as AttemptResult[];
}

function buildSmokeReport(results: AttemptResult[]): string {
  const measured = results.filter((item) => item.ok && item.phase === "measure");
  const failures = results.filter((item) => !item.ok);
  const prompts = [...new Set(measured.map((item) => item.promptId))];
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const lines: string[] = [];

  lines.push("# Smoke Benchmark Report");
  lines.push("");
  lines.push(`Date: ${date}`);
  lines.push("");
  lines.push("This report is generated from a local smoke benchmark run.");
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("- Prompt set: smoke (`short-qna`, `structured`)");
  lines.push("- Primary metric: TTFT (time to first visible text token)");
  lines.push("- Ranking method: best observed configuration per model and prompt, sorted by TTFT");
  lines.push("- Tie-breaker: wall-clock latency");
  lines.push("");
  lines.push("## Caveats");
  lines.push("");
  lines.push(
    "- This repository report was generated from provider-specific smoke runs that were merged after collection.",
  );
  lines.push(
    "- OpenAI chat-latest models use model-managed reasoning; the smoke suite uses a larger output budget so TTFT includes the first visible text after that reasoning phase.",
  );
  lines.push(
    "- OpenAI `priority` and Anthropic `auto` should be interpreted using the effective tier shown in the table, not only the requested tier.",
  );
  lines.push("- Gemini results use the direct Gemini API only.");
  lines.push("- The `n` column shows the measured sample count for each ranked cell.");
  lines.push(
    `- This run contains ${measured.length} measured successes and ${failures.length} failed attempts.`,
  );
  lines.push("");
  lines.push("## TTFT Rankings");

  for (const promptId of prompts) {
    const ranking = buildPromptRanking(measured, promptId);
    const missing = buildMissingList(measured, promptId);

    lines.push("");
    lines.push(`### \`${promptId}\``);
    lines.push("");
    lines.push(
      "| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |",
    );
    lines.push(
      "| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |",
    );
    ranking.forEach((entry, index) => {
      lines.push(
        `| ${
          index + 1
        } | ${entry.provider} | \`${entry.model}\` | \`${entry.variant}\` | \`${entry.tier}\` | ${
          fmtText(entry.responseTier)
        } | ${fmtNumber(entry.ttftMs)} | ${fmtNumber(entry.wallMs)} | ${entry.n} |`,
      );
    });

    if (missing.length > 0) {
      lines.push("");
      lines.push("Rows omitted from the ranking because no visible text token was produced:");
      lines.push("");
      for (const entry of missing) {
        lines.push(
          `- ${entry.provider} \`${entry.model}\` (${entry.variant}, requested \`${entry.tier}\`, effective ${
            fmtText(entry.responseTier)
          })`,
        );
      }
    }
  }

  if (failures.length > 0) {
    lines.push("");
    lines.push("## Failed Attempts");
    lines.push("");
    for (const failure of failures) {
      lines.push(
        `- ${failure.provider} \`${failure.model}\` \`${failure.promptId}\` ${failure.phase}: ${
          failure.error ?? "unknown error"
        }`,
      );
    }
  }

  lines.push("");
  lines.push("## Provider Notes");
  lines.push("");
  lines.push(
    `- OpenAI: ${
      countOpenAiPriorityFallbacks(measured)
    } measured rows requested \`priority\` but were served as \`default\`.`,
  );
  lines.push(
    `- Anthropic: ${
      countAnthropicPriorityAssignments(measured)
    } measured \`auto\` rows were actually served as \`priority\`.`,
  );
  lines.push(
    `- Gemini: ${
      countVariantRows(measured, "gemini", "thinking-off")
    } measured rows used \`thinking-off\`.`,
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildPromptRanking(results: AttemptResult[], promptId: string) {
  const byModel = new Map<string, AttemptResult[]>();

  for (const item of results) {
    if (item.promptId !== promptId) {
      continue;
    }
    const key = `${item.provider}__${item.model}`;
    if (!byModel.has(key)) {
      byModel.set(key, []);
    }
    byModel.get(key)!.push(item);
  }

  return [...byModel.values()]
    .flatMap((group) => {
      const configs = summarizeConfigs(group);
      if (configs.length === 0) {
        return [];
      }
      return [[...configs].sort(compareRankingRows)[0]];
    })
    .sort(compareRankingRows);
}

function buildMissingList(results: AttemptResult[], promptId: string) {
  const byModel = new Map<string, AttemptResult[]>();
  for (const item of results) {
    if (item.promptId !== promptId) {
      continue;
    }
    const key = `${item.provider}__${item.model}`;
    if (!byModel.has(key)) {
      byModel.set(key, []);
    }
    byModel.get(key)!.push(item);
  }

  return [...byModel.values()]
    .filter((group) => group.every((item) => !isNumber(item.ttftMs)))
    .map((group) => group[0])
    .sort((a, b) => `${a.provider}__${a.model}`.localeCompare(`${b.provider}__${b.model}`));
}

function summarizeConfigs(results: AttemptResult[]) {
  const byConfig = new Map<string, AttemptResult[]>();

  for (const item of results) {
    if (!isNumber(item.ttftMs)) {
      continue;
    }
    const key = [
      item.provider,
      item.model,
      item.variant,
      item.tier,
      item.responseTier ?? "",
    ].join("__");
    if (!byConfig.has(key)) {
      byConfig.set(key, []);
    }
    byConfig.get(key)!.push(item);
  }

  return [...byConfig.values()].map((group) => {
    const sample = group[0];
    return {
      provider: sample.provider,
      model: sample.model,
      variant: sample.variant,
      tier: sample.tier,
      responseTier: sample.responseTier,
      ttftMs: median(group.map((item) => item.ttftMs!)),
      wallMs: median(group.map((item) => item.wallMs)),
      n: group.length,
    };
  });
}

function compareRankingRows(
  a: { ttftMs: number | null; wallMs: number },
  b: { ttftMs: number | null; wallMs: number },
): number {
  const ttftA = a.ttftMs ?? Number.POSITIVE_INFINITY;
  const ttftB = b.ttftMs ?? Number.POSITIVE_INFINITY;
  if (ttftA !== ttftB) {
    return ttftA - ttftB;
  }
  return a.wallMs - b.wallMs;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function countOpenAiPriorityFallbacks(results: AttemptResult[]): number {
  return results.filter((item) =>
    item.provider === "openai" && item.tier === "priority" && item.responseTier === "default"
  ).length;
}

function countAnthropicPriorityAssignments(results: AttemptResult[]): number {
  return results.filter((item) =>
    item.provider === "anthropic" && item.tier === "auto" && item.responseTier === "priority"
  ).length;
}

function countVariantRows(
  results: AttemptResult[],
  provider: AttemptResult["provider"],
  variant: AttemptResult["variant"],
): number {
  return results.filter((item) => item.provider === provider && item.variant === variant).length;
}

function fmtNumber(value: number): string {
  return value.toFixed(2);
}

function fmtText(value: string | null): string {
  return value === null ? "-" : `\`${value}\``;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

if (import.meta.main) {
  await main();
}
