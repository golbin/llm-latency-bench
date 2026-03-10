# llm-latency-bench

Cross-provider latency benchmark harness for OpenAI, Anthropic, and Gemini text models.

## Overview

- Single Deno CLI for `probe` and `run`
- Common measurement shape across providers:
  - wall-clock latency
  - TTFT (time to first visible text token)
  - provider-reported metadata when available
- Built-in suites:
  - `smoke`
  - `one-sentence`
  - `input-latency`
  - `output-latency`
  - `full`
- Cache control:
  - `cold` adds a nonce per request
  - `warm` reuses the exact prompt

## Supported providers

OpenAI:

- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-5`
- `gpt-5.1`
- `gpt-5.2`
- `gpt-5.4`
- `gpt-5-mini`
- `gpt-5-chat-latest`
- `gpt-5.1-chat-latest`
- `gpt-5.2-chat-latest`
- `gpt-5.3-chat-latest`

Anthropic:

- `claude-sonnet-4-5-20250929`
- `claude-sonnet-4-6`
- `claude-opus-4-5-20251101`
- `claude-opus-4-6`

Gemini:

- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-3-flash-preview`
- `gemini-3-pro-preview`
- `gemini-3.1-pro-preview`
- `gemini-3.1-flash-lite-preview`

## Credentials

Set API keys in the shell, or create a local `.env` from [`.env.example`](./.env.example).

```bash
export OPENAI_API_KEY=...
export ANTHROPIC_API_KEY=...
export GOOGLE_API_KEY=...
```

Or pass an explicit file:

```bash
deno task probe --env-file /absolute/path/to/.env
```

If you want to use shell environment only:

```bash
deno task run --env-file none
```

## Usage

Basic commands:

```bash
deno task probe
deno task run --iterations 3 --warmups 1
deno task report -- /path/to/run.json ./reports/smoke-report-2026-03-10.md
deno task fastest-report -- /path/to/fastest.json /path/to/strict.json ./reports/fastest-achievable-report-2026-03-10.md
```

Common examples:

```bash
deno task run --providers anthropic,gemini --suite smoke
deno task run --suite one-sentence --iterations 3 --warmups 1
deno task run --models claude-opus-4-6,gemini-2.5-flash --suite smoke
deno task run --suite input-latency --iterations 3 --warmups 1
deno task run --suite output-latency --cache-mode warm
deno task run --out-dir ./results/sample
```

## Provider-specific behavior

- OpenAI:
  - `default` vs `priority`
  - `reasoning.effort="none"` on `gpt-5.1`, `gpt-5.2`, `gpt-5.4`
  - `reasoning.effort="minimal"` on `gpt-5` and `gpt-5-mini`
  - chat-latest models are benchmarked as-is and may keep provider-managed reasoning behavior
- Anthropic:
  - `service_tier=standard_only` vs `auto`
  - `low-effort` variant for Opus 4.5 and Opus 4.6
- Gemini:
  - direct Gemini API only
  - `thinking-off` variant for `gemini-2.5-flash`, `gemini-3-flash-preview`, and
    `gemini-3.1-flash-lite-preview`

## Smoke suite notes

- The smoke suite prioritizes TTFT comparability.
- `short-qna` and `structured` use a larger output token budget so models that spend tokens on
  internal reasoning still produce visible text.
- TTFT is recorded when the first visible text delta arrives from the provider stream.

## One-sentence suite

- `one-sentence` is the deployment-oriented suite for minimum-latency comparisons.
- It uses a single exact-sentence prompt and records both TTFT and full completion wall time.
- This is the best fit when comparing "fastest achievable" service configurations across models.

## Repository layout

- [`src/main.ts`](./src/main.ts): CLI entry point
- [`src/report.ts`](./src/report.ts): markdown report generator
- [`src/fastest_report.ts`](./src/fastest_report.ts): one-sentence fastest-achievable report
  generator
- [`src/config.ts`](./src/config.ts): argument parsing and defaults
- [`src/providers.ts`](./src/providers.ts): provider adapters
- [`src/prompts.ts`](./src/prompts.ts): benchmark suites
- [`src/results.ts`](./src/results.ts): summaries and CSV/JSON output
- [`reports/smoke-report-2026-03-10.md`](./reports/smoke-report-2026-03-10.md): current published
  smoke report
- [`reports/fastest-achievable-report-2026-03-10.md`](./reports/fastest-achievable-report-2026-03-10.md):
  current fastest-achievable one-sentence report

## Publishing hygiene

- Raw run artifacts under `results/` are git-ignored.
- Local `.env` files are git-ignored.
- The repository keeps the benchmark report, not the generated request logs.
