# Smoke Benchmark Report

Date: 2026-03-10

This report summarizes the latest smoke benchmark runs for OpenAI, Anthropic, and Gemini.

## Source Runs

- OpenAI smoke run: `n=2` measured samples per cell
- Anthropic + Gemini smoke run: `n=1` measured sample per cell

The raw JSON and CSV artifacts were generated locally and are intentionally not kept in the
repository.

## Scope

- Prompt set:
  - `short-qna`
  - `structured`
- Metrics:
  - wall-clock latency
  - TTFT
- Provider-specific settings:
  - OpenAI: `default` vs `priority`, `reasoning.effort=none` on GPT-5 reasoning-family models
  - Anthropic: `standard_only` vs `auto`; `low-effort` for Opus 4.5 and Opus 4.6
  - Gemini: `baseline` vs `thinking-off` for `gemini-2.5-flash`

## Caveats

- This is not yet a statistically stable cross-provider comparison.
- OpenAI results use `n=2` measured samples; Anthropic and Gemini currently use `n=1`.
- Anthropic `auto` requests were all served as `standard`, so no Priority Tier uplift was observed
  in this account.
- Gemini was benchmarked through the direct Gemini API only, not Vertex AI Provisioned Throughput.

## Best Observed Latency By Provider

### `short-qna`

| Provider  | Best configuration                                    | Wall ms | TTFT ms |
| --------- | ----------------------------------------------------- | ------: | ------: |
| OpenAI    | `gpt-4.1` `priority`                                  |  872.55 |  556.20 |
| Gemini    | `gemini-2.5-flash-lite` `baseline`                    | 1030.48 | 1011.28 |
| Anthropic | `claude-opus-4-5-20251101` `standard_only` `baseline` | 1766.67 | 1028.10 |

### `structured`

| Provider  | Best configuration                                      | Wall ms | TTFT ms |
| --------- | ------------------------------------------------------- | ------: | ------: |
| OpenAI    | `gpt-4.1` `priority`                                    |  910.85 |  581.98 |
| Gemini    | `gemini-2.5-flash` `thinking-off`                       | 1289.39 |  997.29 |
| Anthropic | `claude-opus-4-5-20251101` `standard_only` `low-effort` | 1917.04 |  873.67 |

## OpenAI

OpenAI was the fastest provider in both smoke prompts in the current dataset. The strongest overall
configuration was `gpt-4.1` with `priority`, followed closely by `gpt-5.1` `priority` on
`short-qna`.

| Model     | Prompt       | Default wall ms | Priority wall ms | Improvement |
| --------- | ------------ | --------------: | ---------------: | ----------: |
| `gpt-4.1` | `short-qna`  |          922.65 |           872.55 |        5.4% |
| `gpt-4.1` | `structured` |         1725.91 |           910.85 |       47.2% |
| `gpt-5.1` | `short-qna`  |         1226.63 |           875.95 |       28.6% |
| `gpt-5.1` | `structured` |         1433.85 |          1022.30 |       28.7% |
| `gpt-5.4` | `short-qna`  |         1104.20 |           925.80 |       16.2% |
| `gpt-5.4` | `structured` |         1164.19 |           951.98 |       18.2% |

Notes:

- `gpt-5-mini` was excluded because the API rejected `reasoning.effort="none"`.
- All recorded OpenAI `priority` requests came back with `responseTier="priority"` in the validated
  runs.

## Anthropic

Anthropic completed successfully across Sonnet 4.5/4.6 and Opus 4.5/4.6. In this account, `auto`
never escalated beyond `standard`, so the `auto` vs `standard_only` comparison does not represent
true priority capacity.

Best observed Anthropic configurations:

| Model                      | Prompt       | Best configuration         | Wall ms |
| -------------------------- | ------------ | -------------------------- | ------: |
| `claude-sonnet-4-6`        | `short-qna`  | `standard_only baseline`   | 2472.82 |
| `claude-sonnet-4-6`        | `structured` | `standard_only baseline`   | 2621.79 |
| `claude-opus-4-5-20251101` | `short-qna`  | `standard_only baseline`   | 1766.67 |
| `claude-opus-4-5-20251101` | `structured` | `standard_only low-effort` | 1917.04 |
| `claude-opus-4-6`          | `short-qna`  | `auto low-effort`          | 2479.45 |
| `claude-opus-4-6`          | `structured` | `standard_only low-effort` | 3243.16 |

Observed `low-effort` effects:

- `claude-opus-4-6` improved consistently in this smoke sample:
  - `short-qna`: 10.5% faster on `standard_only`
  - `structured`: 13.3% faster on `standard_only`
  - `short-qna`: 21.2% faster on `auto`
  - `structured`: 12.0% faster on `auto`
- `claude-opus-4-5-20251101` was inconsistent:
  - `structured` improved strongly on `standard_only`
  - `short-qna` regressed in both tiers

## Gemini

Gemini direct API ran successfully for `gemini-2.5-pro`, `gemini-2.5-flash`, and
`gemini-2.5-flash-lite`. The main useful optimization in this dataset was `thinking-off` on
`gemini-2.5-flash`.

| Model              | Prompt       | Baseline wall ms | Optimized wall ms | Improvement |
| ------------------ | ------------ | ---------------: | ----------------: | ----------: |
| `gemini-2.5-flash` | `short-qna`  |          1725.10 |           1187.82 |       31.1% |
| `gemini-2.5-flash` | `structured` |          1416.39 |           1289.39 |        9.0% |

Other notable Gemini results:

- `gemini-2.5-flash-lite` was the fastest Gemini model on `short-qna` at 1030.48 ms.
- `gemini-2.5-pro` was the slowest Gemini model in the smoke run:
  - `short-qna`: 3142.13 ms
  - `structured`: 4396.70 ms

## Takeaways

1. In the current smoke data, OpenAI has the lowest latency floor.
2. Gemini is the closest provider to OpenAI on short outputs when using `flash-lite` or `flash` with
   `thinking-off`.
3. Anthropic appears materially slower in this account and test shape, but this needs a larger
   sample before treating it as a stable ranking.
4. Anthropic `auto` should not be interpreted as a priority benchmark here because all responses
   were still served as `standard`.

## Next Steps

1. Re-run all providers at `n=10` minimum for smoke.
2. Run `input-latency` and `output-latency` suites across all three providers.
3. Add a second Anthropic report after confirming real Priority Tier entitlement.
4. Add Vertex AI `shared` vs `dedicated` Gemini results if Provisioned Throughput becomes available.
