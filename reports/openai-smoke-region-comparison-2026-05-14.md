# OpenAI Smoke Region Comparison

Date: 2026-05-14

This report compares the same OpenAI smoke benchmark from two client origins.

## Scope

- Korea-origin: local workstation in Korea, over the public internet
- US-origin: ephemeral GCP VM in `us-central1-a` (`e2-micro`, Debian 12)
- Provider: OpenAI only
- Prompt set: smoke (`short-qna`, `structured`)
- Cache mode: cold
- Measurement: 1 warmup and 5 measured samples per model/tier/prompt cell
- Ranking rule: choose the best observed configuration per model and prompt by TTFT p50, then wall-clock p50

Source artifacts:

- [Korea smoke report](./smoke-report-2026-05-14.md)
- [US smoke report](./smoke-report-us-central1-2026-05-14.md)
- Korea raw JSON: `results/run-2026-05-14-064224261Z.json`
- US raw JSON: `results/us-central1-run-2026-05-14-065015717Z.json`

## Executive Summary

- `short-qna`: Korea winner `gpt-5.2` priority at 658.12 ms TTFT; US winner `gpt-5.1` priority at 447.50 ms TTFT.
- `structured`: Korea winner `gpt-5.4` priority at 630.18 ms TTFT; US winner `gpt-4.1` priority at 389.49 ms TTFT.
- The US-origin VM was faster on TTFT for almost every best-per-model smoke comparison, with the largest gains on `chat-latest` and `gpt-4.1`/`gpt-4.1-mini`.
- Korea-origin favored `gpt-5.2 priority` for `short-qna`, while US-origin favored `gpt-5.1 priority`; within GPT-5-family `structured`, `gpt-5.4 priority` remained the lowest-TTFT choice in both origins.
- `chat-latest` accepted `priority` requests but returned effective `default` in the measured priority cells, so compare it by effective tier.

## Winners By Prompt

| Prompt | Korea best | Korea TTFT | Korea wall | US best | US TTFT | US wall |
| ----- | ----- | ----------: | ----------: | ----- | ----------: | ----------: |
| `short-qna` | `gpt-5.2` priority | 658.12 | 1186.99 | `gpt-5.1` priority | 447.50 | 842.12 |
| `structured` | `gpt-5.4` priority | 630.18 | 1164.64 | `gpt-4.1` priority | 389.49 | 913.76 |

## Priority vs Default

This section compares requested `priority` against requested `default` for the same model and prompt.
`chat-latest` is excluded from the effective-priority average because its `priority` requests were served
as effective `default`.

| Origin | Effective-priority cells | Avg TTFT change | Avg wall change |
| ----- | -----------------------: | --------------: | --------------: |
| Korea-origin | 16 | -9.5% | -13.0% |
| US-origin | 16 | -13.2% | -20.1% |

Interpretation:

- `priority` improved both TTFT p50 and wall-clock p50 on average in both origins.
- The benefit was larger from the US-origin VM, especially on wall-clock latency.
- The effect is not universal. Some cells regressed, so the strongest case for enabling `priority`
  is model-specific rather than global.

### `gpt-5.2` Priority Effect

`gpt-5.2` had one of the clearest priority benefits in this run.

| Origin | Prompt | Default TTFT | Priority TTFT | TTFT change | Default wall | Priority wall | Wall change |
| ----- | ----- | -----------: | ------------: | ----------: | -----------: | ------------: | ----------: |
| Korea-origin | `short-qna` | 828.73 | 658.12 | -20.6% | 1904.49 | 1186.99 | -37.7% |
| Korea-origin | `structured` | 863.38 | 791.16 | -8.4% | 1888.88 | 1685.16 | -10.8% |
| US-origin | `short-qna` | 720.71 | 478.29 | -33.6% | 1321.72 | 1126.33 | -14.8% |
| US-origin | `structured` | 544.40 | 478.47 | -12.1% | 1602.71 | 1450.37 | -9.5% |

Operational takeaway:

- For latency-sensitive `gpt-5.2` paths, `priority` is justified by this dataset: all four
  origin/prompt cells improved on both TTFT and wall-clock latency.
- The largest `gpt-5.2` gains were on `short-qna`, where TTFT improved by 20.6% from Korea-origin
  and 33.6% from US-origin.

## Best-Per-Model Comparison: `short-qna`

| Model | Korea setting | Korea TTFT | Korea wall | US setting | US TTFT | US wall | TTFT change | Wall change |
| ----- | ----- | ----------: | ----------: | ----- | ----------: | ----------: | ----- | ----- |
| `gpt-4.1` | priority | 765.16 | 1122.54 | priority | 531.99 | 845.41 | US -30.5% faster | US -24.7% faster |
| `gpt-4.1-mini` | priority | 955.39 | 1354.35 | priority | 494.74 | 887.99 | US -48.2% faster | US -34.4% faster |
| `gpt-5` | priority | 706.90 | 1165.25 | priority | 578.43 | 1183.19 | US -18.2% faster | US +1.5% slower |
| `gpt-5.1` | priority | 744.00 | 1235.85 | priority | 447.50 | 842.12 | US -39.9% faster | US -31.9% faster |
| `gpt-5.2` | priority | 658.12 | 1186.99 | priority | 478.29 | 1126.33 | US -27.3% faster | US -5.1% faster |
| `gpt-5.4` | default | 667.13 | 1358.87 | priority | 457.25 | 1094.69 | US -31.5% faster | US -19.4% faster |
| `gpt-5.5` | priority | 815.13 | 1463.76 | priority | 666.38 | 1274.32 | US -18.2% faster | US -12.9% faster |
| `gpt-5-mini` | priority | 883.41 | 1282.61 | priority | 486.04 | 818.29 | US -45.0% faster | US -36.2% faster |
| `chat-latest` | default | 1392.45 | 1841.76 | priority->default | 736.38 | 1212.30 | US -47.1% faster | US -34.2% faster |

## Best-Per-Model Comparison: `structured`

| Model | Korea setting | Korea TTFT | Korea wall | US setting | US TTFT | US wall | TTFT change | Wall change |
| ----- | ----- | ----------: | ----------: | ----- | ----------: | ----------: | ----- | ----- |
| `gpt-4.1` | default | 744.41 | 1330.48 | priority | 389.49 | 913.76 | US -47.7% faster | US -31.3% faster |
| `gpt-4.1-mini` | priority | 1213.09 | 1686.05 | priority | 545.50 | 918.62 | US -55.0% faster | US -45.5% faster |
| `gpt-5` | priority | 645.22 | 1335.65 | priority | 539.56 | 1113.46 | US -16.4% faster | US -16.6% faster |
| `gpt-5.1` | priority | 840.14 | 1527.07 | default | 476.66 | 1321.56 | US -43.3% faster | US -13.5% faster |
| `gpt-5.2` | priority | 791.16 | 1685.16 | priority | 478.47 | 1450.37 | US -39.5% faster | US -13.9% faster |
| `gpt-5.4` | priority | 630.18 | 1164.64 | priority | 453.07 | 966.10 | US -28.1% faster | US -17.0% faster |
| `gpt-5.5` | priority | 857.61 | 1636.08 | default | 708.77 | 1481.06 | US -17.4% faster | US -9.5% faster |
| `gpt-5-mini` | default | 732.55 | 1450.85 | priority | 526.64 | 912.08 | US -28.1% faster | US -37.1% faster |
| `chat-latest` | priority->default | 1153.17 | 1704.41 | priority->default | 621.81 | 1011.16 | US -46.1% faster | US -40.7% faster |

## Notes

- This is a client-origin comparison, not a pure provider-region placement test. OpenAI routing and service internals are opaque from these measurements.
- The GCP VM was deleted after collecting the run artifacts.
- Raw `results/` artifacts are git-ignored in this repository; the checked-in evidence is the generated markdown report unless raw files are deliberately archived elsewhere.
