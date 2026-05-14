# Smoke Benchmark Report

Date: 2026-05-14

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
- This run contains 180 measured successes and 0 failed attempts.

## TTFT Rankings

### `short-qna`

| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |
| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |
| 1 | openai | `gpt-5.1` | `baseline` | `priority` | `priority` | 447.50 | 842.12 | 5 |
| 2 | openai | `gpt-5.4` | `baseline` | `priority` | `priority` | 457.25 | 1094.69 | 5 |
| 3 | openai | `gpt-5.2` | `baseline` | `priority` | `priority` | 478.29 | 1126.33 | 5 |
| 4 | openai | `gpt-5-mini` | `baseline` | `priority` | `priority` | 486.04 | 818.29 | 5 |
| 5 | openai | `gpt-4.1-mini` | `baseline` | `priority` | `priority` | 494.74 | 887.99 | 5 |
| 6 | openai | `gpt-4.1` | `baseline` | `priority` | `priority` | 531.99 | 845.41 | 5 |
| 7 | openai | `gpt-5` | `baseline` | `priority` | `priority` | 578.43 | 1183.19 | 5 |
| 8 | openai | `gpt-5.5` | `baseline` | `priority` | `priority` | 666.38 | 1274.32 | 5 |
| 9 | openai | `chat-latest` | `baseline` | `priority` | `default` | 736.38 | 1212.30 | 5 |

### `structured`

| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |
| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |
| 1 | openai | `gpt-4.1` | `baseline` | `priority` | `priority` | 389.49 | 913.76 | 5 |
| 2 | openai | `gpt-5.4` | `baseline` | `priority` | `priority` | 453.07 | 966.10 | 5 |
| 3 | openai | `gpt-5.1` | `baseline` | `default` | `default` | 476.66 | 1321.56 | 5 |
| 4 | openai | `gpt-5.2` | `baseline` | `priority` | `priority` | 478.47 | 1450.37 | 5 |
| 5 | openai | `gpt-5-mini` | `baseline` | `priority` | `priority` | 526.64 | 912.08 | 5 |
| 6 | openai | `gpt-5` | `baseline` | `priority` | `priority` | 539.56 | 1113.46 | 5 |
| 7 | openai | `gpt-4.1-mini` | `baseline` | `priority` | `priority` | 545.50 | 918.62 | 5 |
| 8 | openai | `chat-latest` | `baseline` | `priority` | `default` | 621.81 | 1011.16 | 5 |
| 9 | openai | `gpt-5.5` | `baseline` | `default` | `default` | 708.77 | 1481.06 | 5 |

## Provider Notes

- OpenAI: 10 measured rows requested `priority` but were served as `default`.
- Anthropic: 0 measured `auto` rows were actually served as `priority`.
- Gemini: 0 measured rows used `thinking-off`.

