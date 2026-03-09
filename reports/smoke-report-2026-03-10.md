# Smoke Benchmark Report

Date: 2026-03-10

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
- Each published smoke cell in this report uses `n=1` measured sample.
- This run contains 88 measured successes and 0 failed attempts.

## TTFT Rankings

### `short-qna`

| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |
| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |
| 1 | openai | `gpt-5.2` | `baseline` | `priority` | `priority` | 462.51 | 1079.59 | 1 |
| 2 | openai | `gpt-4.1-mini` | `baseline` | `priority` | `priority` | 486.74 | 754.33 | 1 |
| 3 | openai | `gpt-5-chat-latest` | `baseline` | `priority` | `default` | 503.99 | 706.68 | 1 |
| 4 | openai | `gpt-5` | `baseline` | `priority` | `priority` | 527.14 | 902.15 | 1 |
| 5 | openai | `gpt-5.1` | `baseline` | `priority` | `priority` | 542.66 | 872.80 | 1 |
| 6 | openai | `gpt-5-mini` | `baseline` | `priority` | `priority` | 556.77 | 875.52 | 1 |
| 7 | openai | `gpt-5.4` | `baseline` | `priority` | `priority` | 563.58 | 1143.71 | 1 |
| 8 | openai | `gpt-4.1` | `baseline` | `default` | `default` | 572.64 | 2636.44 | 1 |
| 9 | gemini | `gemini-2.5-flash-lite` | `baseline` | `default` | - | 850.36 | 850.86 | 1 |
| 10 | gemini | `gemini-2.5-flash` | `thinking-off` | `default` | - | 965.07 | 974.71 | 1 |
| 11 | openai | `gpt-5.1-chat-latest` | `baseline` | `default` | `default` | 1044.02 | 1569.20 | 1 |
| 12 | anthropic | `claude-opus-4-5-20251101` | `low-effort` | `standard_only` | `standard` | 1197.48 | 1792.97 | 1 |
| 13 | gemini | `gemini-3-flash-preview` | `thinking-off` | `default` | - | 1317.01 | 1320.60 | 1 |
| 14 | openai | `gpt-5.2-chat-latest` | `baseline` | `default` | `default` | 1506.87 | 2092.44 | 1 |
| 15 | anthropic | `claude-sonnet-4-6` | `baseline` | `standard_only` | `standard` | 1514.63 | 2572.49 | 1 |
| 16 | anthropic | `claude-opus-4-6` | `baseline` | `standard_only` | `standard` | 1632.55 | 3087.16 | 1 |
| 17 | openai | `gpt-5.3-chat-latest` | `baseline` | `priority` | `default` | 2010.31 | 2287.72 | 1 |
| 18 | anthropic | `claude-sonnet-4-5-20250929` | `baseline` | `standard_only` | `standard` | 2442.42 | 3217.32 | 1 |
| 19 | gemini | `gemini-2.5-pro` | `baseline` | `default` | - | 3058.64 | 4738.48 | 1 |
| 20 | gemini | `gemini-3-pro-preview` | `baseline` | `default` | - | 4456.28 | 4462.58 | 1 |
| 21 | gemini | `gemini-3.1-pro-preview` | `baseline` | `default` | - | 4835.84 | 4841.52 | 1 |
| 22 | gemini | `gemini-3.1-flash-lite-preview` | `baseline` | `default` | - | 8571.59 | 8576.76 | 1 |

### `structured`

| Rank | Provider | Model | Variant | Requested Tier | Effective Tier | TTFT ms | Wall ms | n |
| ----: | -------- | ----- | ------- | ------------- | ------------- | ------: | ------: | -: |
| 1 | openai | `gpt-5-chat-latest` | `baseline` | `default` | `default` | 432.28 | 905.35 | 1 |
| 2 | openai | `gpt-5.2` | `baseline` | `priority` | `priority` | 486.48 | 1329.33 | 1 |
| 3 | openai | `gpt-5.4` | `baseline` | `default` | `default` | 499.28 | 1017.96 | 1 |
| 4 | openai | `gpt-5.1` | `baseline` | `priority` | `priority` | 505.82 | 941.02 | 1 |
| 5 | openai | `gpt-4.1-mini` | `baseline` | `default` | `default` | 514.22 | 1208.80 | 1 |
| 6 | openai | `gpt-5` | `baseline` | `priority` | `priority` | 515.55 | 1010.98 | 1 |
| 7 | openai | `gpt-5-mini` | `baseline` | `priority` | `priority` | 537.85 | 897.32 | 1 |
| 8 | openai | `gpt-4.1` | `baseline` | `default` | `default` | 629.04 | 1383.16 | 1 |
| 9 | anthropic | `claude-sonnet-4-5-20250929` | `baseline` | `auto` | `standard` | 719.58 | 2192.81 | 1 |
| 10 | gemini | `gemini-2.5-flash-lite` | `baseline` | `default` | - | 860.97 | 863.61 | 1 |
| 11 | anthropic | `claude-opus-4-5-20251101` | `low-effort` | `standard_only` | `standard` | 1073.71 | 2880.96 | 1 |
| 12 | gemini | `gemini-2.5-flash` | `thinking-off` | `default` | - | 1157.01 | 1291.27 | 1 |
| 13 | openai | `gpt-5.1-chat-latest` | `baseline` | `default` | `default` | 1177.66 | 1719.29 | 1 |
| 14 | anthropic | `claude-sonnet-4-6` | `baseline` | `standard_only` | `standard` | 1213.27 | 2536.91 | 1 |
| 15 | gemini | `gemini-3.1-flash-lite-preview` | `thinking-off` | `default` | - | 1378.83 | 1464.92 | 1 |
| 16 | gemini | `gemini-3-flash-preview` | `thinking-off` | `default` | - | 1586.98 | 1695.19 | 1 |
| 17 | openai | `gpt-5.3-chat-latest` | `baseline` | `priority` | `default` | 1753.51 | 2096.82 | 1 |
| 18 | anthropic | `claude-opus-4-6` | `baseline` | `auto` | `standard` | 1811.82 | 3732.32 | 1 |
| 19 | openai | `gpt-5.2-chat-latest` | `baseline` | `priority` | `default` | 2004.69 | 2819.74 | 1 |
| 20 | gemini | `gemini-2.5-pro` | `baseline` | `default` | - | 4903.55 | 7152.13 | 1 |
| 21 | gemini | `gemini-3.1-pro-preview` | `baseline` | `default` | - | 5378.95 | 5379.25 | 1 |
| 22 | gemini | `gemini-3-pro-preview` | `baseline` | `default` | - | 5758.60 | 5764.46 | 1 |

## Provider Notes

- OpenAI: 8 measured rows requested `priority` but were served as `default`.
- Anthropic: 0 measured `auto` rows were actually served as `priority`.
- Gemini: 6 measured rows used `thinking-off`.

