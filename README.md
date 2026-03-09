# llm-latency-bench

Cross-provider latency benchmark harness for OpenAI, Anthropic, and Gemini text models.

## Overview

- Single Deno CLI for `probe` and `run`
- Common measurement shape across providers:
  - wall-clock latency
  - TTFT
  - provider-reported metadata when available
- Built-in suites:
  - `smoke`
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
- `gpt-5.1`
- `gpt-5.2`
- `gpt-5.4`
- `gpt-5-mini` is probe-gated and excluded if `reasoning.effort="none"` is rejected

Anthropic:

- `claude-sonnet-4-5-20250929`
- `claude-sonnet-4-6`
- `claude-opus-4-5-20251101`
- `claude-opus-4-6`

Gemini:

- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

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
```

Common examples:

```bash
deno task run --providers anthropic,gemini --suite smoke
deno task run --models claude-opus-4-6,gemini-2.5-flash --suite smoke
deno task run --suite input-latency --iterations 3 --warmups 1
deno task run --suite output-latency --cache-mode warm
deno task run --out-dir ./results/sample
```

## Provider-specific behavior

- OpenAI:
  - `default` vs `priority`
  - `reasoning.effort="none"` on GPT-5 reasoning-family models
- Anthropic:
  - `service_tier=standard_only` vs `auto`
  - `low-effort` variant for Opus 4.5 and Opus 4.6
- Gemini:
  - direct Gemini API only
  - `thinking-off` variant for `gemini-2.5-flash`

## Repository layout

- [`src/main.ts`](./src/main.ts): CLI entry point
- [`src/config.ts`](./src/config.ts): argument parsing and defaults
- [`src/providers.ts`](./src/providers.ts): provider adapters
- [`src/prompts.ts`](./src/prompts.ts): benchmark suites
- [`src/results.ts`](./src/results.ts): summaries and CSV/JSON output
- [`reports/smoke-report-2026-03-10.md`](./reports/smoke-report-2026-03-10.md): current published
  smoke report

## Publishing hygiene

- Raw run artifacts under `results/` are git-ignored.
- Local `.env` files are git-ignored.
- The repository keeps the benchmark report, not the generated request logs.
