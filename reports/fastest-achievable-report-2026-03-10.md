# Fastest-Achievable Latency Report

Date: 2026-03-10

This report answers a deployment question: which provider/model/setting combination yields the lowest latency for a one-sentence response.

## Method

- Prompt: one sentence in ASCII
- Metrics: TTFT and wall-clock completion time
- Cache mode: cold (nonce added per request)
- Main fastest-achievable run: `n=3` measured samples per cell
- Strict OpenAI `none` cohort: `n=5` measured samples per cell
- Ranking rule: choose the best observed configuration per model, then rank models by TTFT
- Effective tier matters more than requested tier

## Configuration Rules

- OpenAI `gpt-5.1`, `gpt-5.2`, `gpt-5.4`: `reasoning.effort="none"`
- OpenAI `gpt-5`, `gpt-5-mini`: `reasoning.effort="minimal"`
- OpenAI `chat-latest` models: provider-managed reasoning or required `medium`; no `none` mode
- Anthropic: `low-effort` used where supported if it wins
- Gemini: `thinking-off` used where supported if it wins

## Fastest-Achievable Ranking

| Rank | Provider | Model | Best setting | Effective tier | TTFT p50 ms | Wall p50 ms | n |
| ----: | -------- | ----- | ------------ | ------------- | ----------: | ----------: | -: |
| 1 | openai | `gpt-5-chat-latest` | variant `baseline`, requested tier `default` | `default` | 432.85 | 800.70 | 3 |
| 2 | openai | `gpt-5.2` | variant `baseline`, requested tier `priority` | `priority` | 455.91 | 926.35 | 3 |
| 3 | openai | `gpt-5.4` | variant `baseline`, requested tier `default` | `default` | 493.54 | 1082.50 | 3 |
| 4 | openai | `gpt-5.1` | variant `baseline`, requested tier `priority` | `priority` | 524.34 | 905.96 | 3 |
| 5 | openai | `gpt-5` | variant `baseline`, requested tier `priority` | `priority` | 587.54 | 1012.09 | 3 |
| 6 | openai | `gpt-5-mini` | variant `baseline`, requested tier `default` | `default` | 679.80 | 1455.40 | 3 |
| 7 | anthropic | `claude-opus-4-5-20251101` | variant `baseline`, requested tier `auto` | `standard` | 907.72 | 1907.49 | 3 |
| 8 | gemini | `gemini-2.5-flash-lite` | variant `baseline`, requested tier `default` | - | 926.00 | 928.99 | 3 |
| 9 | gemini | `gemini-2.5-flash` | variant `thinking-off`, requested tier `default` | - | 1056.26 | 1085.65 | 3 |
| 10 | gemini | `gemini-3.1-flash-lite-preview` | variant `baseline`, requested tier `default` | - | 1316.13 | 1321.22 | 3 |
| 11 | anthropic | `claude-sonnet-4-6` | variant `baseline`, requested tier `standard_only` | `standard` | 1322.08 | 2827.17 | 3 |
| 12 | gemini | `gemini-3-flash-preview` | variant `thinking-off`, requested tier `default` | - | 1360.70 | 1511.45 | 3 |
| 13 | anthropic | `claude-opus-4-6` | variant `baseline`, requested tier `standard_only` | `standard` | 1453.93 | 2575.22 | 3 |
| 14 | anthropic | `claude-sonnet-4-5-20250929` | variant `baseline`, requested tier `auto` | `standard` | 1550.19 | 2381.01 | 3 |
| 15 | openai | `gpt-5.1-chat-latest` | variant `baseline`, requested tier `priority` | `default` | 1595.33 | 2091.46 | 3 |
| 16 | openai | `gpt-5.2-chat-latest` | variant `baseline`, requested tier `default` | `default` | 2095.93 | 2619.46 | 3 |
| 17 | openai | `gpt-5.3-chat-latest` | variant `baseline`, requested tier `priority` | `default` | 2445.97 | 2831.84 | 2 |
| 18 | gemini | `gemini-3-pro-preview` | variant `baseline`, requested tier `default` | - | 4373.21 | 4380.78 | 3 |
| 19 | gemini | `gemini-2.5-pro` | variant `baseline`, requested tier `default` | - | 4476.90 | 5552.52 | 3 |
| 20 | gemini | `gemini-3.1-pro-preview` | variant `baseline`, requested tier `default` | - | 4806.93 | 4815.45 | 3 |

## Lowest Wall-Clock Completion Ranking

| Rank | Provider | Model | Best setting | Effective tier | Wall p50 ms | TTFT p50 ms | n |
| ----: | -------- | ----- | ------------ | ------------- | ----------: | ----------: | -: |
| 1 | openai | `gpt-5-chat-latest` | variant `baseline`, requested tier `default` | `default` | 800.70 | 432.85 | 3 |
| 2 | openai | `gpt-5.1` | variant `baseline`, requested tier `priority` | `priority` | 905.96 | 524.34 | 3 |
| 3 | openai | `gpt-5.2` | variant `baseline`, requested tier `priority` | `priority` | 926.35 | 455.91 | 3 |
| 4 | gemini | `gemini-2.5-flash-lite` | variant `baseline`, requested tier `default` | - | 928.99 | 926.00 | 3 |
| 5 | openai | `gpt-5` | variant `baseline`, requested tier `priority` | `priority` | 1012.09 | 587.54 | 3 |
| 6 | openai | `gpt-5.4` | variant `baseline`, requested tier `default` | `default` | 1082.50 | 493.54 | 3 |
| 7 | gemini | `gemini-2.5-flash` | variant `thinking-off`, requested tier `default` | - | 1085.65 | 1056.26 | 3 |
| 8 | gemini | `gemini-3.1-flash-lite-preview` | variant `baseline`, requested tier `default` | - | 1321.22 | 1316.13 | 3 |
| 9 | openai | `gpt-5-mini` | variant `baseline`, requested tier `default` | `default` | 1455.40 | 679.80 | 3 |
| 10 | gemini | `gemini-3-flash-preview` | variant `thinking-off`, requested tier `default` | - | 1511.45 | 1360.70 | 3 |
| 11 | anthropic | `claude-opus-4-5-20251101` | variant `baseline`, requested tier `auto` | `standard` | 1907.49 | 907.72 | 3 |
| 12 | openai | `gpt-5.1-chat-latest` | variant `baseline`, requested tier `priority` | `default` | 2091.46 | 1595.33 | 3 |
| 13 | anthropic | `claude-sonnet-4-5-20250929` | variant `baseline`, requested tier `auto` | `standard` | 2381.01 | 1550.19 | 3 |
| 14 | anthropic | `claude-opus-4-6` | variant `baseline`, requested tier `standard_only` | `standard` | 2575.22 | 1453.93 | 3 |
| 15 | openai | `gpt-5.2-chat-latest` | variant `baseline`, requested tier `default` | `default` | 2619.46 | 2095.93 | 3 |
| 16 | anthropic | `claude-sonnet-4-6` | variant `baseline`, requested tier `standard_only` | `standard` | 2827.17 | 1322.08 | 3 |
| 17 | openai | `gpt-5.3-chat-latest` | variant `baseline`, requested tier `priority` | `default` | 2831.84 | 2445.97 | 2 |
| 18 | gemini | `gemini-3-pro-preview` | variant `baseline`, requested tier `default` | - | 4380.78 | 4373.21 | 3 |
| 19 | gemini | `gemini-3.1-pro-preview` | variant `baseline`, requested tier `default` | - | 4815.45 | 4806.93 | 3 |
| 20 | gemini | `gemini-2.5-pro` | variant `baseline`, requested tier `default` | - | 5552.52 | 4476.90 | 3 |

## Best By Provider

- openai: `gpt-5-chat-latest` with variant `baseline`, requested tier `default` (`default`) -> TTFT p50 432.85 / wall p50 800.70
- anthropic: `claude-opus-4-5-20251101` with variant `baseline`, requested tier `auto` (`standard`) -> TTFT p50 907.72 / wall p50 1907.49
- gemini: `gemini-2.5-flash-lite` with variant `baseline`, requested tier `default` (-) -> TTFT p50 926.00 / wall p50 928.99

## OpenAI Strict `reasoning.effort="none"` Cohort

Only models that actually support `none` are included here.

| Model | Requested tier | Effective tier | TTFT p50 ms | Wall p50 ms | n |
| ----- | ------------- | ------------- | ----------: | ----------: | -: |
| `gpt-5.1` | `default` | `default` | 672.62 | 1194.14 | 5 |
| `gpt-5.1` | `priority` | `priority` | 527.45 | 916.76 | 5 |
| `gpt-5.2` | `default` | `default` | 702.01 | 1367.11 | 5 |
| `gpt-5.2` | `priority` | `priority` | 524.61 | 1124.07 | 5 |
| `gpt-5.4` | `default` | `default` | 645.52 | 1218.37 | 5 |
| `gpt-5.4` | `priority` | `priority` | 527.34 | 1006.72 | 5 |

## Notes

- `priority` does not guarantee a lower single-sample latency; it reduces queueing risk, so small samples can still invert.
- In this report, `priority` rows that actually came back as `default` are not treated as true priority wins.
- `structured` and `short-qna` are not interchangeable because output format pressure changes first-token behavior.
- `chat-latest` should not be read as a `reasoning-none` comparison because those models do not expose the same control surface.

