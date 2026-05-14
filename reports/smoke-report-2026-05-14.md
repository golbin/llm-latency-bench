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
| 1 | openai | `gpt-5.2` | `baseline` | `priority` | `priority` | 658.12 | 1186.99 | 5 |
| 2 | openai | `gpt-5.4` | `baseline` | `default` | `default` | 667.13 | 1358.87 | 5 |
| 3 | openai | `gpt-5` | `baseline` | `priority` | `priority` | 706.90 | 1165.25 | 5 |
| 4 | openai | `gpt-5.1` | `baseline` | `priority` | `priority` | 744.00 | 1235.85 | 5 |
| 5 | openai | `gpt-4.1` | `baseline` | `priority` | `priority` | 765.16 | 1122.54 | 5 |
| 6 | openai | `gpt-5.5` | `baseline` | `priority` | `priority` | 815.13 | 1463.76 | 5 |
| 7 | openai | `gpt-5-mini` | `baseline` | `priority` | `priority` | 883.41 | 1282.61 | 5 |
| 8 | openai | `gpt-4.1-mini` | `baseline` | `priority` | `priority` | 955.39 | 1354.35 | 5 |
| 9 | openai | `chat-latest` | `baseline` | `default` | `default` | 1392.45 | 1841.76 | 5 |

### `structured`

| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |
| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |
| 1 | openai | `gpt-5.4` | `baseline` | `priority` | `priority` | 630.18 | 1164.64 | 5 |
| 2 | openai | `gpt-5` | `baseline` | `priority` | `priority` | 645.22 | 1335.65 | 5 |
| 3 | openai | `gpt-5-mini` | `baseline` | `default` | `default` | 732.55 | 1450.85 | 5 |
| 4 | openai | `gpt-4.1` | `baseline` | `default` | `default` | 744.41 | 1330.48 | 5 |
| 5 | openai | `gpt-5.2` | `baseline` | `priority` | `priority` | 791.16 | 1685.16 | 5 |
| 6 | openai | `gpt-5.1` | `baseline` | `priority` | `priority` | 840.14 | 1527.07 | 5 |
| 7 | openai | `gpt-5.5` | `baseline` | `priority` | `priority` | 857.61 | 1636.08 | 5 |
| 8 | openai | `chat-latest` | `baseline` | `priority` | `default` | 1153.17 | 1704.41 | 5 |
| 9 | openai | `gpt-4.1-mini` | `baseline` | `priority` | `priority` | 1213.09 | 1686.05 | 5 |

## Provider Notes

- OpenAI: 10 measured rows requested `priority` but were served as `default`.
- Anthropic: 0 measured `auto` rows were actually served as `priority`.
- Gemini: 0 measured rows used `thinking-off`.

