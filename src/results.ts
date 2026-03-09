import type { AttemptResult, Command, Provider, Variant } from "./types.ts";

export async function writeResults(outDir: string, prefix: string, results: AttemptResult[]) {
  const jsonPath = `${outDir}/${prefix}.json`;
  const csvPath = `${outDir}/${prefix}.csv`;
  await Deno.writeTextFile(jsonPath, JSON.stringify(results, null, 2));
  await Deno.writeTextFile(csvPath, toCsv(results));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${csvPath}`);
}

export function printSummary(results: AttemptResult[], mode: Command) {
  const measured = results.filter((entry) =>
    entry.ok && (mode === "probe" || entry.phase === "measure")
  );
  const failures = results.filter((entry) => !entry.ok);

  console.log("");
  console.log(`Summary (${mode})`);
  for (const group of groupResults(measured)) {
    const wall = percentileSeries(group.items.map((item) => item.wallMs));
    const ttft = percentileSeries(group.items.map((item) => item.ttftMs).filter(isNumber));
    const processing = percentileSeries(
      group.items.map((item) => item.processingMs).filter(isNumber),
    );
    const tierState = group.items.every((item) => tierMatches(item.tier, item.responseTier))
      ? "tier=ok"
      : "tier=mismatch";

    console.log(
      [
        `${group.provider}`,
        `${group.model}`,
        `${group.tier}`,
        `${group.variant}`,
        `${group.promptId}`,
        `n=${group.items.length}`,
        tierState,
        `wall p50=${fmt(wall.p50)} p95=${fmt(wall.p95)}`,
        `ttft p50=${fmt(ttft.p50)} p95=${fmt(ttft.p95)}`,
        `proc p50=${fmt(processing.p50)} p95=${fmt(processing.p95)}`,
      ].join(" | "),
    );
  }

  if (failures.length > 0) {
    console.log("");
    console.log("Failures");
    for (const failure of failures) {
      console.log(
        `${failure.provider} | ${failure.model} | ${failure.tier} | ${failure.variant} | ${failure.promptId} | ${failure.phase} | ${failure.error}`,
      );
    }
  }
}

export function roundMs(value: number): number {
  return Math.round(value * 100) / 100;
}

export function compactError(errText: string): string {
  const trimmed = errText.trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}

export function parseHeaderNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCsv(results: AttemptResult[]): string {
  const headers: (keyof AttemptResult)[] = [
    "ok",
    "provider",
    "phase",
    "model",
    "tier",
    "variant",
    "promptId",
    "attempt",
    "timestamp",
    "wallMs",
    "ttftMs",
    "processingMs",
    "requestId",
    "responseId",
    "responseModel",
    "responseTier",
    "outputTextChars",
    "inputChars",
    "outputTokens",
    "error",
  ];
  const lines = [headers.join(",")];
  for (const result of results) {
    lines.push(headers.map((header) => csvCell(result[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function groupResults(results: AttemptResult[]) {
  const byKey = new Map<
    string,
    {
      provider: Provider;
      model: string;
      tier: string;
      variant: Variant;
      promptId: string;
      items: AttemptResult[];
    }
  >();

  for (const result of results) {
    const key =
      `${result.provider}__${result.model}__${result.tier}__${result.variant}__${result.promptId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        provider: result.provider,
        model: result.model,
        tier: result.tier,
        variant: result.variant,
        promptId: result.promptId,
        items: [],
      });
    }
    byKey.get(key)!.items.push(result);
  }

  return [...byKey.values()];
}

function percentileSeries(values: number[]) {
  if (values.length === 0) {
    return { p50: null, p95: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: pickPercentile(sorted, 0.5),
    p95: pickPercentile(sorted, 0.95),
  };
}

function pickPercentile(sorted: number[], percentile: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1));
  return roundMs(sorted[index]);
}

function fmt(value: number | null): string {
  return value === null ? "-" : `${value}ms`;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function tierMatches(requestedTier: string, responseTier: string | null): boolean {
  if (responseTier === null) {
    return true;
  }
  if (requestedTier === "standard_only") {
    return responseTier === "standard";
  }
  if (requestedTier === "auto") {
    return responseTier === "standard" || responseTier === "priority";
  }
  return requestedTier === responseTier;
}
