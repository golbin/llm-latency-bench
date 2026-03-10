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
| 1 | gemini | `gemini-2.5-flash-lite` | variant `baseline`, requested tier `default` | - | 204.82 | 307.97 | 3 |
| 2 | openai | `gpt-5.2` | variant `baseline`, requested tier `priority` | `priority` | 360.18 | 1710.97 | 3 |
| 3 | openai | `gpt-5.4` | variant `baseline`, requested tier `default` | `default` | 399.19 | 1013.26 | 3 |
| 4 | openai | `gpt-5-chat-latest` | variant `baseline`, requested tier `default` | `default` | 437.67 | 764.76 | 3 |
| 5 | openai | `gpt-5.1` | variant `baseline`, requested tier `default` | `default` | 454.90 | 1013.44 | 3 |
| 6 | anthropic | `claude-opus-4-5-20251101` | variant `low-effort`, requested tier `auto` | `standard` | 1403.21 | 2027.29 | 3 |

## Lowest Wall-Clock Completion Ranking

| Rank | Provider | Model | Best setting | Effective tier | Wall p50 ms | TTFT p50 ms | n |
| ----: | -------- | ----- | ------------ | ------------- | ----------: | ----------: | -: |
| 1 | gemini | `gemini-2.5-flash-lite` | variant `baseline`, requested tier `default` | - | 307.97 | 204.82 | 3 |
| 2 | openai | `gpt-5-chat-latest` | variant `baseline`, requested tier `default` | `default` | 764.76 | 437.67 | 3 |
| 3 | openai | `gpt-5.4` | variant `baseline`, requested tier `default` | `default` | 1013.26 | 399.19 | 3 |
| 4 | openai | `gpt-5.1` | variant `baseline`, requested tier `default` | `default` | 1013.44 | 454.90 | 3 |
| 5 | openai | `gpt-5.2` | variant `baseline`, requested tier `priority` | `priority` | 1710.97 | 360.18 | 3 |
| 6 | anthropic | `claude-opus-4-5-20251101` | variant `low-effort`, requested tier `auto` | `standard` | 2027.29 | 1403.21 | 3 |

## Best By Provider

- openai: `gpt-5.2` with variant `baseline`, requested tier `priority` (`priority`) -> TTFT p50 360.18 / wall p50 1710.97
- anthropic: `claude-opus-4-5-20251101` with variant `low-effort`, requested tier `auto` (`standard`) -> TTFT p50 1403.21 / wall p50 2027.29
- gemini: `gemini-2.5-flash-lite` with variant `baseline`, requested tier `default` (-) -> TTFT p50 204.82 / wall p50 307.97

## OpenAI Strict `reasoning.effort="none"` Cohort

Only models that actually support `none` are included here.

| Model | Requested tier | Effective tier | TTFT p50 ms | Wall p50 ms | n |
| ----- | ------------- | ------------- | ----------: | ----------: | -: |
| `gpt-5.1` | `default` | `default` | 803.24 | 1523.67 | 5 |
| `gpt-5.1` | `priority` | `priority` | 452.36 | 1071.36 | 5 |
| `gpt-5.2` | `default` | `default` | 391.48 | 976.18 | 5 |
| `gpt-5.2` | `priority` | `priority` | 354.87 | 815.01 | 5 |
| `gpt-5.4` | `default` | `default` | 401.48 | 959.86 | 5 |
| `gpt-5.4` | `priority` | `priority` | 403.98 | 870.22 | 5 |

## Notes

- `priority` does not guarantee a lower single-sample latency; it reduces queueing risk, so small samples can still invert.
- In this report, `priority` rows that actually came back as `default` are not treated as true priority wins.
- `structured` and `short-qna` are not interchangeable because output format pressure changes first-token behavior.
- `chat-latest` should not be read as a `reasoning-none` comparison because those models do not expose the same control surface.

