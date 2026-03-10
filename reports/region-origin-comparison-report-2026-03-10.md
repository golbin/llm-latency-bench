# Korea-Origin vs US-Origin Latency Comparison

Date: 2026-03-10

This report compares two different client-origin paths:

- Korea-origin: local workstation in Korea, over the public internet
- US-origin: ephemeral GCP VM in `us-central1-a`

The purpose is not to crown a single universal winner. The purpose is to answer a deployment question:

- which model/provider combination is fastest for users near Korea?
- which combination is fastest for users near the US?
- which OpenAI GPT-5-family configuration is the safest low-latency default across both origins?

## Scope

- Prompt: one sentence in ASCII
- Metrics:
  - TTFT
  - wall-clock completion time
- Fastest-achievable runs:
  - Korea-origin: `n=3`
  - US-origin shortlist: `n=3`
- OpenAI strict `reasoning.effort="none"` cohort:
  - Korea-origin: `n=5`
  - US-origin: `n=5`

Source reports:

- [fastest-achievable-report-2026-03-10.md](/Users/jin/Workspace/etc/llm-latency-bench/reports/fastest-achievable-report-2026-03-10.md)
- [us-central1-fastest-shortlist-report-2026-03-10.md](/Users/jin/Workspace/etc/llm-latency-bench/reports/us-central1-fastest-shortlist-report-2026-03-10.md)

## Important Caveat

The Korea-origin result is not a Korea cloud VM result. It is a real client-side Korea-origin path from the local machine. That makes it useful for user-facing latency decisions, but it is not a pure cloud-to-cloud regional benchmark.

## Executive Summary

1. The fastest overall result changed by client origin.
2. Korea-origin favored OpenAI `gpt-5-chat-latest` for lowest end-to-end one-sentence latency.
3. US-origin strongly favored Gemini `gemini-2.5-flash-lite`.
4. For OpenAI models with explicit `reasoning.effort="none"`, `gpt-5.2` with `priority` was the most robust low-latency choice across both origins.
5. Anthropic was not the latency leader in either origin path in this dataset.

## Overall Winners By Origin

| Origin | Best TTFT winner | TTFT p50 ms | Best wall winner | Wall p50 ms |
| ----- | ----- | ----------: | ----- | ----------: |
| Korea-origin | `gpt-5-chat-latest` `default` | 432.85 | `gpt-5-chat-latest` `default` | 800.70 |
| US-origin | `gemini-2.5-flash-lite` `default` | 204.82 | `gemini-2.5-flash-lite` `default` | 307.97 |

Interpretation:

- If the user is near Korea, OpenAI `gpt-5-chat-latest` was the best observed low-latency choice.
- If the user is near the US, Gemini `gemini-2.5-flash-lite` was clearly faster than the shortlist alternatives.

## Cross-Origin Fastest-Achievable Comparison

This table compares the overlapping shortlist models that were used for the US run.

| Provider | Model | Korea best setting | Korea TTFT | Korea wall | US best setting | US TTFT | US wall | TTFT change |
| ----- | ----- | ----- | ----------: | ----------: | ----- | ----------: | ----------: | ----- |
| OpenAI | `gpt-5-chat-latest` | `default` | 432.85 | 800.70 | `default` | 437.67 | 764.76 | US `+1.1%` slower on TTFT, `-4.5%` faster on wall |
| OpenAI | `gpt-5.1` | `priority`, `none` | 524.34 | 905.96 | `default`, `none` | 454.90 | 1013.44 | US `-13.2%` faster on TTFT, `+11.9%` slower on wall |
| OpenAI | `gpt-5.2` | `priority`, `none` | 455.91 | 926.35 | `priority`, `none` | 360.18 | 1710.97 | US `-21.0%` faster on TTFT, but wall degraded in this `n=3` sample |
| OpenAI | `gpt-5.4` | `default`, `none` | 493.54 | 1082.50 | `default`, `none` | 399.19 | 1013.26 | US `-19.1%` faster on TTFT, `-6.4%` faster on wall |
| Anthropic | `claude-opus-4-5-20251101` | `auto baseline` | 907.72 | 1907.49 | `auto low-effort` | 1403.21 | 2027.29 | US slower in this sample |
| Gemini | `gemini-2.5-flash-lite` | `default` | 926.00 | 928.99 | `default` | 204.82 | 307.97 | US `-77.9%` faster on TTFT, `-66.8%` faster on wall |

Key takeaways:

- `gpt-5-chat-latest` was relatively stable across origins.
- `gemini-2.5-flash-lite` improved dramatically from the US VM path.
- `gpt-5.4` also improved materially from the US path.
- `gpt-5.2` showed very strong US TTFT, but its US `n=3` wall result was noisy enough that the strict `n=5` cohort is the better source of truth.

## OpenAI Strict `reasoning.effort="none"` Comparison

This is the cleanest apples-to-apples comparison for GPT-5-family models that actually support `none`.

### `priority`

| Model | Korea TTFT | Korea wall | US TTFT | US wall | TTFT change | Wall change |
| ----- | ----------: | ----------: | ----------: | ----------: | ----- | ----- |
| `gpt-5.1` | 527.45 | 916.76 | 452.36 | 1071.36 | US `-14.2%` faster | US `+16.9%` slower |
| `gpt-5.2` | 524.61 | 1124.07 | 354.87 | 815.01 | US `-32.3%` faster | US `-27.5%` faster |
| `gpt-5.4` | 527.34 | 1006.72 | 403.98 | 870.22 | US `-23.4%` faster | US `-13.6%` faster |

### `default`

| Model | Korea TTFT | Korea wall | US TTFT | US wall | TTFT change | Wall change |
| ----- | ----------: | ----------: | ----------: | ----------: | ----- | ----- |
| `gpt-5.1` | 672.62 | 1194.14 | 803.24 | 1523.67 | US slower |
| `gpt-5.2` | 702.01 | 1367.11 | 391.48 | 976.18 | US much faster |
| `gpt-5.4` | 645.52 | 1218.37 | 401.48 | 959.86 | US much faster |

Interpretation:

- `gpt-5.2 priority` is the cleanest cross-origin OpenAI recommendation.
- `gpt-5.4 priority` is also strong, but `gpt-5.2 priority` still wins on TTFT in the strict cohort.
- `gpt-5.1` was less region-stable than `gpt-5.2`.

## Deployment Guidance

If your traffic is mostly Korea-origin:

- First choice for minimum latency: `gpt-5-chat-latest` `default`
- If you need explicit `reasoning.effort="none"`: `gpt-5.2` `priority`

If your traffic is mostly US-origin:

- Absolute latency-first choice: `gemini-2.5-flash-lite` `default`
- If you need OpenAI with explicit `reasoning.effort="none"`: `gpt-5.2` `priority`
- If you want lower OpenAI wall time than `gpt-5.2 priority`: `gpt-5-chat-latest` `default`, but this is not a `none` cohort model

If you need one OpenAI GPT-5-family default across both origins:

- Choose `gpt-5.2` with `priority` and `reasoning.effort="none"`

Reason:

- It was the best strict-`none` TTFT result in both origins.
- It avoided the region instability seen in `gpt-5.1`.
- It beat `gpt-5.4` on TTFT in the strict cohort, especially from the US-origin path.

## Bottom Line

The biggest strategic lesson is that client origin changed the winner.

- Korea-origin winner: OpenAI `gpt-5-chat-latest`
- US-origin winner: Gemini `gemini-2.5-flash-lite`
- Best cross-origin OpenAI strict-`none` choice: `gpt-5.2 priority`
