# Smoke Benchmark Report

Date: 2026-07-10

This report is generated from a local smoke benchmark run.

## Scope

- Prompt set: smoke (`short-qna`, `structured`)
- Primary metric: TTFT (time to first visible text token)
- Ranking method: best observed configuration per model and prompt, sorted by TTFT
- Tie-breaker: wall-clock latency

## Caveats

- This repository report was generated from provider-specific smoke runs that were merged after collection.
- OpenAI chat-latest models use model-managed reasoning; the smoke suite uses a larger output budget so TTFT includes the first visible text after that reasoning phase.
- OpenAI `priority` and Anthropic `auto` should be interpreted using the effective tier shown in the table, not only the requested tier.
- Gemini results use the direct Gemini API only.
- The `n` column shows the measured sample count for each ranked cell.
- This run contains 12 measured successes and 0 failed attempts.

## TTFT Rankings

### `one-sentence`

| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |
| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |
| 1 | openai | `gpt-5.2` | `baseline` | `default` | `default` | 546.73 | 1278.44 | 3 |
| 2 | openai | `gpt-4.1` | `baseline` | `priority` | `priority` | 610.43 | 947.48 | 3 |

## Provider Notes

- OpenAI: 0 measured rows requested `priority` but were served as `default`.
- Anthropic: 0 measured `auto` rows were actually served as `priority`.
- Gemini: 0 measured rows used `thinking-off`.
