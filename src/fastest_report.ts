import type { AttemptResult } from "./types.ts";

type FastestRow = {
  model: string;
  provider: string;
  requestedTier: string;
  effectiveTier: string | null;
  variant: string;
  ttftMs: number;
  wallMs: number;
  n: number;
};

async function main() {
  const { fastestPath, strictPath, outputPath } = parseArgs(Deno.args);
  const fastestResults = await readResults(fastestPath);
  const strictResults = strictPath ? await readResults(strictPath) : [];
  const markdown = buildReport(fastestResults, strictResults);
  await Deno.writeTextFile(outputPath, markdown);
  console.log(`Wrote ${outputPath}`);
}

function parseArgs(args: string[]) {
  const [fastestPath, strictPath, outputPath] = args;
  if (!fastestPath || !outputPath) {
    throw new Error(
      "Usage: deno run --allow-read --allow-write src/fastest_report.ts <fastest.json> [strict.json] <output.md>",
    );
  }

  if (outputPath) {
    return { fastestPath, strictPath, outputPath };
  }

  return { fastestPath, strictPath: null, outputPath: strictPath };
}

async function readResults(path: string): Promise<AttemptResult[]> {
  const raw = await Deno.readTextFile(path);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a JSON array in ${path}`);
  }
  return parsed as AttemptResult[];
}

function buildReport(fastestResults: AttemptResult[], strictResults: AttemptResult[]): string {
  const measuredFastest = fastestResults.filter((item) => item.ok && item.phase === "measure");
  const measuredStrict = strictResults.filter((item) => item.ok && item.phase === "measure");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const lines: string[] = [];
  lines.push("# Fastest-Achievable Latency Report");
  lines.push("");
  lines.push(`Date: ${date}`);
  lines.push("");
  lines.push(
    "This report answers a deployment question: which provider/model/setting combination yields the lowest latency for a one-sentence response.",
  );
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push("- Prompt: one sentence in ASCII");
  lines.push("- Metrics: TTFT and wall-clock completion time");
  lines.push("- Cache mode: cold (nonce added per request)");
  lines.push("- Main fastest-achievable run: `n=3` measured samples per cell");
  if (measuredStrict.length > 0) {
    lines.push("- Strict OpenAI `none` cohort: `n=5` measured samples per cell");
  }
  lines.push(
    "- Ranking rule: choose the best observed configuration per model, then rank models by TTFT",
  );
  lines.push("- Effective tier matters more than requested tier");
  lines.push("");
  lines.push("## Configuration Rules");
  lines.push("");
  lines.push('- OpenAI `gpt-5.1`, `gpt-5.2`, `gpt-5.4`: `reasoning.effort="none"`');
  lines.push('- OpenAI `gpt-5`, `gpt-5-mini`: `reasoning.effort="minimal"`');
  lines.push(
    "- OpenAI `chat-latest` models: provider-managed reasoning or required `medium`; no `none` mode",
  );
  lines.push("- Anthropic: `low-effort` used where supported if it wins");
  lines.push("- Gemini: `thinking-off` used where supported if it wins");
  lines.push("");
  lines.push("## Fastest-Achievable Ranking");
  lines.push("");
  lines.push(
    "| Rank | Provider | Model | Best setting | Effective tier | TTFT p50 ms | Wall p50 ms | n |",
  );
  lines.push(
    "| ----: | -------- | ----- | ------------ | ------------- | ----------: | ----------: | -: |",
  );

  const fastestRows = buildFastestRows(measuredFastest).sort(compareRows);
  fastestRows.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.provider} | \`${row.model}\` | ${formatSetting(row)} | ${
        formatTier(row.effectiveTier)
      } | ${fmt(row.ttftMs)} | ${fmt(row.wallMs)} | ${row.n} |`,
    );
  });

  lines.push("");
  lines.push("## Lowest Wall-Clock Completion Ranking");
  lines.push("");
  lines.push(
    "| Rank | Provider | Model | Best setting | Effective tier | Wall p50 ms | TTFT p50 ms | n |",
  );
  lines.push(
    "| ----: | -------- | ----- | ------------ | ------------- | ----------: | ----------: | -: |",
  );

  [...fastestRows].sort(compareWallRows).forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.provider} | \`${row.model}\` | ${formatSetting(row)} | ${
        formatTier(row.effectiveTier)
      } | ${fmt(row.wallMs)} | ${fmt(row.ttftMs)} | ${row.n} |`,
    );
  });

  lines.push("");
  lines.push("## Best By Provider");
  lines.push("");
  for (const provider of ["openai", "anthropic", "gemini"]) {
    const best = fastestRows.find((row) => row.provider === provider);
    if (!best) {
      continue;
    }
    lines.push(
      `- ${provider}: \`${best.model}\` with ${formatSetting(best)} (${
        formatTier(best.effectiveTier)
      }) -> TTFT p50 ${fmt(best.ttftMs)} / wall p50 ${fmt(best.wallMs)}`,
    );
  }

  if (measuredStrict.length > 0) {
    lines.push("");
    lines.push('## OpenAI Strict `reasoning.effort="none"` Cohort');
    lines.push("");
    lines.push("Only models that actually support `none` are included here.");
    lines.push("");
    lines.push("| Model | Requested tier | Effective tier | TTFT p50 ms | Wall p50 ms | n |");
    lines.push("| ----- | ------------- | ------------- | ----------: | ----------: | -: |");
    buildStrictRows(measuredStrict).forEach((row) => {
      lines.push(
        `| \`${row.model}\` | \`${row.requestedTier}\` | ${formatTier(row.effectiveTier)} | ${
          fmt(row.ttftMs)
        } | ${fmt(row.wallMs)} | ${row.n} |`,
      );
    });
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(
    "- `priority` does not guarantee a lower single-sample latency; it reduces queueing risk, so small samples can still invert.",
  );
  lines.push(
    "- In this report, `priority` rows that actually came back as `default` are not treated as true priority wins.",
  );
  lines.push(
    "- `structured` and `short-qna` are not interchangeable because output format pressure changes first-token behavior.",
  );
  lines.push(
    "- `chat-latest` should not be read as a `reasoning-none` comparison because those models do not expose the same control surface.",
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildFastestRows(results: AttemptResult[]): FastestRow[] {
  const byModel = new Map<string, AttemptResult[]>();
  for (const item of results) {
    if (!shouldIncludeInFastestReport(item)) {
      continue;
    }
    const key = `${item.provider}__${item.model}`;
    if (!byModel.has(key)) {
      byModel.set(key, []);
    }
    byModel.get(key)!.push(item);
  }

  return [...byModel.values()].flatMap((group) => {
    const summaries = summarizeByConfig(group);
    if (summaries.length === 0) {
      return [];
    }
    return [[...summaries].sort(compareRows)[0]];
  });
}

function buildStrictRows(results: AttemptResult[]): FastestRow[] {
  return summarizeByConfig(results)
    .filter((row) => ["gpt-5.1", "gpt-5.2", "gpt-5.4"].includes(row.model))
    .sort((a, b) =>
      a.model.localeCompare(b.model) || a.requestedTier.localeCompare(b.requestedTier)
    );
}

function summarizeByConfig(results: AttemptResult[]): FastestRow[] {
  const byConfig = new Map<string, AttemptResult[]>();
  for (const item of results) {
    if (item.promptId !== "one-sentence" || !isNumber(item.ttftMs)) {
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
      model: sample.model,
      provider: sample.provider,
      requestedTier: sample.tier,
      effectiveTier: sample.responseTier,
      variant: sample.variant,
      ttftMs: median(group.map((item) => item.ttftMs!)),
      wallMs: median(group.map((item) => item.wallMs)),
      n: group.length,
    };
  });
}

function compareRows(a: FastestRow, b: FastestRow): number {
  return a.ttftMs - b.ttftMs || a.wallMs - b.wallMs;
}

function compareWallRows(a: FastestRow, b: FastestRow): number {
  return a.wallMs - b.wallMs || a.ttftMs - b.ttftMs;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function fmt(value: number): string {
  return value.toFixed(2);
}

function formatTier(value: string | null): string {
  return value === null ? "-" : `\`${value}\``;
}

function formatSetting(row: FastestRow): string {
  return `variant \`${row.variant}\`, requested tier \`${row.requestedTier}\``;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function shouldIncludeInFastestReport(item: AttemptResult): boolean {
  if (item.provider !== "openai") {
    return true;
  }
  return item.model.startsWith("gpt-5");
}

if (import.meta.main) {
  await main();
}
