# One-sentence latency benchmark — 2026-08-15

> 최신 확정 표는 구성별 10회 재측정 보고서
> [`one-sentence-benchmark-n10-2026-08-15.md`](./one-sentence-benchmark-n10-2026-08-15.md)를
> 사용한다. 아래 내용은 최초 n=3 스모크 실행 기록이다.

## 결론

- 한 문장 전체 완료시간 기준 1위는 `solar-pro4`의 **884.65 ms**, 2위는
  `gpt-4.1` priority의 **888.27 ms**였다.
- `gpt-5.6-luna` priority는 **947.52 ms**로 3위였고, `gpt-4.1-mini` priority는
  **959.45 ms**로 4위였다.
- `gemini-3.5-flash-lite` reasoning off는 **1,037.75 ms**, `gemini-3.7-flash`
  reasoning off는 **2,851.82 ms**였다.
  기본 설정은 측정 묶음에 따라 중앙값이 2.84초에서 17.91초까지 달라져 출시 당일
  변동성이 매우 컸다.
- 과거 대비 한 문장 완료시간은 `gpt-4.1`이 6.2% 빨라졌고, `gpt-5.2`가 13.6%
  느려졌다. `gpt-4.1-mini`는 29.2% 빨라졌다.
- OpenAI Standard(default)만 보면 `gpt-5.6-luna`가 987.86 ms로 가장 빨랐다.
  Luna는 priority가 완료시간을 4.1%만 줄였고 TTFT는 오히려 53.71 ms 느려, 이 짧은
  요청에서는 priority 프리미엄의 이점이 작았다.

## 조건

- 실행 위치: 서울, 대한민국
- 실행일: 2026-08-15 KST
- suite: `one-sentence`
- cache mode: `cold` (요청마다 nonce 추가)
- 표본: 구성별 warmup 1회 + 측정 3회
- 지표: 첫 visible text까지의 TTFT 및 전체 스트림 완료 wall time의 중앙값
- OpenAI: default와 priority를 모두 측정하고 wall time이 더 낮은 구성을 채택
- Gemini: Vertex AI global endpoint에서 baseline과 지원되는 최소 reasoning 설정 측정
- Solar Pro 4: Upstage streaming Chat Completions API
- 본 실행은 36개 측정 요청 모두 성공했다. warmup을 포함하면 48개 요청이다.

프롬프트:

> Return exactly one ASCII sentence describing why latency benchmarks must control for cache effects.

## 한 문장 전체 완료시간 순위

각 모델에서 reasoning을 최대한 끈 구성을 사용했다. GPT-4.1 계열은 reasoning
파라미터를 지원하지 않는 비-reasoning 모델이다. 순위는 프롬프트 전송부터 한 문장
스트림 종료까지의 wall time 중앙값으로 매겼으며 TTFT는 보조 지표다.

가격은 2026-08-15 현재 실제 측정 tier의 텍스트 토큰 단가다. 단위는 USD/1M tokens이며,
OpenAI는 priority, Vertex AI는 Standard(global) 가격을 적용했다.

| 순위 | 모델 | Provider | 구성 | 한 문장 완료 | TTFT | 입력 $/1M | 출력 $/1M | n |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `solar-pro4` | Upstage | reasoning none | 884.65 ms | 384.95 ms | $0.03* | $0.12* | 3 |
| 2 | `gpt-4.1` | OpenAI | priority | 888.27 ms | 584.36 ms | $3.50 | $14.00 | 3 |
| 3 | `gpt-5.6-luna` | OpenAI | priority, reasoning none | 947.52 ms | 645.82 ms | $0.40 | $2.40 | 3 |
| 4 | `gpt-4.1-mini` | OpenAI | priority | 959.45 ms | 561.26 ms | $0.70 | $2.80 | 3 |
| 5 | `gpt-5.6-terra` | OpenAI | priority, reasoning none | 992.55 ms | 715.15 ms | $4.00 | $24.00 | 3 |
| 6 | `gemini-3.5-flash-lite` | Vertex AI | thinking off | 1,037.75 ms | 772.57 ms | $0.30 | $2.50 | 3 |
| 7 | `gpt-5.2` | OpenAI | priority, reasoning none | 1,291.90 ms | 634.83 ms | $3.50 | $28.00 | 3 |
| 8 | `gemini-3.6-flash` | Vertex AI | thinking off | 1,318.88 ms | 1,071.94 ms | $0.75** | $3.75** | 3 |
| 9 | `gemini-3.7-flash` | Vertex AI | thinking off | 2,851.82 ms | 2,519.44 ms | $0.75** | $3.75** | 3 |

\* Solar Pro 4는 2026-09-10 UTC까지 90% 출시 할인가다. 이후 정상가는 입력 $0.30,
출력 $1.20이다.
\** Gemini 3.6/3.7 Flash는 2026-12-31까지 도입 가격이다. 2027-01-01부터 입력
$1.50, 출력 $7.50이 적용될 예정이다. Gemini의 출력 단가에는 response와 reasoning
토큰이 모두 포함된다.

## OpenAI Standard와 Priority 비교

두 tier 모두 같은 프롬프트, cold cache, reasoning 최소 설정, n=3이다. `완료 개선`은
Standard 대비 Priority의 한 문장 완료시간 감소율이며, 가격은 해당 tier의 USD/1M
text tokens다.

| 모델 | Tier | 한 문장 완료 | TTFT | 입력 $/1M | 출력 $/1M | Priority 완료 개선 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `gpt-4.1` | Standard | 1,392.78 ms | 896.07 ms | $2.00 | $8.00 | — |
| `gpt-4.1` | Priority | 888.27 ms | 584.36 ms | $3.50 | $14.00 | 36.2% |
| `gpt-4.1-mini` | Standard | 1,476.19 ms | 1,097.75 ms | $0.40 | $1.60 | — |
| `gpt-4.1-mini` | Priority | 959.45 ms | 561.26 ms | $0.70 | $2.80 | 35.0% |
| `gpt-5.6-luna` | Standard, reasoning none | 987.86 ms | 592.11 ms | $0.20 | $1.20 | — |
| `gpt-5.6-luna` | Priority, reasoning none | 947.52 ms | 645.82 ms | $0.40 | $2.40 | 4.1% |
| `gpt-5.6-terra` | Standard, reasoning none | 1,173.58 ms | 829.03 ms | $2.00 | $12.00 | — |
| `gpt-5.6-terra` | Priority, reasoning none | 992.55 ms | 715.15 ms | $4.00 | $24.00 | 15.4% |
| `gpt-5.2` | Standard, reasoning none | 1,363.25 ms | 649.37 ms | $1.75 | $14.00 | — |
| `gpt-5.2` | Priority, reasoning none | 1,291.90 ms | 634.83 ms | $3.50 | $28.00 | 5.2% |

이 표본에서는 GPT-4.1 계열만 Priority로 약 35–36% 크게 빨라졌다. GPT-5.2와 Luna는
가격이 약 2배가 되는 데 비해 완료시간 개선이 각각 5.2%, 4.1%였고, Luna의 TTFT는
Priority가 Standard보다 9.1% 느렸다.

## 과거 대비

양수는 느려짐, 음수는 빨라짐을 뜻한다. `gpt-4.1`과 `gpt-5.2`는 동일한
2026-07-10 one-sentence 실행과 비교했다. 당시 one-sentence 결과가 없는
`gpt-4.1-mini`는 2026-05-14 smoke의 `short-qna`를 사용했으며, 실제 프롬프트와
출력 한도는 현재 one-sentence와 동일하다.

| 모델 | 과거 최저 TTFT | 현재 최저 TTFT | TTFT 변화 | 과거 Wall | 현재 Wall | Wall 변화 | 평가 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `gpt-4.1` | 610.43 ms | 584.36 ms | -4.3% | 947.48 ms | 888.27 ms | -6.2% | 유의미하게 달라졌다고 보기 어려움 |
| `gpt-4.1-mini` | 955.39 ms | 561.26 ms | -41.3% | 1,354.35 ms | 959.45 ms | -29.2% | 크게 빨라짐 |
| `gpt-5.2` | 619.16 ms | 634.83 ms | +2.5% | 1,136.93 ms | 1,291.90 ms | +13.6% | 시작은 비슷하나 한 문장 완료는 다소 느려짐 |

초기 실행에서는 GPT-5.6 계열에 reasoning effort를 명시하지 않아 Luna가 1,007.66 ms로
측정됐다. `reasoning.effort=none`을 명시하자 TTFT는 592.11 ms로 약 41.2%, 한 문장
완료는 1,349.51 ms에서 947.52 ms로 약 29.8% 빨라졌다. 따라서 초기 GPT-5.6 결과를
모델 크기나 순수 추론 속도의 차이로 해석하면 안 된다.

## Gemini 3.7 Flash 변동성

- 첫 baseline 본 실행: TTFT 중앙값 17,906.02 ms, 범위 2,623.65–32,708.55 ms
- 두 번째 baseline: TTFT 중앙값 2,618.09 ms, 범위 2,358.47–2,730.53 ms
- 세 번째 baseline: TTFT 중앙값 2,842.66 ms, 범위 2,756.68–19,408.54 ms
- `thinkingLevel=LOW`: TTFT 중앙값 2,320.09 ms, 범위 2,166.89–2,577.94 ms

Vertex 공통 API가 정의하는 `MINIMAL`도 확인했지만 이 모델은
`Thinking level is unsupported: THINKING_LEVEL_MINIMAL`로 거절했다. 따라서 순위에는
reasoning을 완전히 끄는 `thinkingBudget=0`을 사용했다. 다만 off의 TTFT 중앙값도
2,519.44 ms여서, 3.7 Flash의 지연은 hidden reasoning만으로 설명되지 않는다.

## Flash-Lite

현재 공개된 최신 Flash-Lite ID인 `gemini-3.5-flash-lite`를 Vertex AI에서 측정했다.

| 설정 | TTFT 중앙값 | Wall 중앙값 |
| --- | ---: | ---: |
| baseline | 873.06 ms | 1,107.73 ms |
| `thinkingLevel=LOW` | 1,416.38 ms | 1,573.29 ms |
| `thinkingLevel=MINIMAL` | 772.52 ms | 1,078.57 ms |
| `thinkingBudget=0` | 772.57 ms | 1,037.75 ms |

MINIMAL과 off의 TTFT 차이는 0.05 ms로 표본 오차보다 훨씬 작았다. 완료 시간은 off가
약 41 ms 빨랐다.

## Gemini 3.6 Flash

| 설정 | TTFT 중앙값 | 한 문장 완료 중앙값 |
| --- | ---: | ---: |
| baseline | 2,447.56 ms | 2,642.55 ms |
| `thinkingLevel=LOW` | 2,208.67 ms | 2,265.25 ms |
| `thinkingLevel=MINIMAL` | 832.46 ms | 1,067.49 ms |
| `thinkingBudget=0` | 1,071.94 ms | 1,318.88 ms |

3.6 Flash는 MINIMAL이 완전 off보다 한 문장 완료 기준 약 251 ms 빨랐다. 완전히
reasoning을 끄는 조건끼리 비교하면 3.5 Flash-Lite보다 약 281 ms 느리고, 3.7
Flash보다는 약 1.53초 빨랐다.

## 해석상 주의

- n=3은 방향을 보는 스모크 벤치마크이지 정밀한 SLA 추정치가 아니다.
- 서로 다른 provider의 서버 위치와 네트워크 경로가 다르다.
- priority tier는 비용이 더 들 수 있으므로 default와 동일 가격 조건의 순위가 아니다.
- TTFT는 체감 시작 속도이고 wall time은 짧은 답변의 완료 속도다. 긴 출력 처리량은 이
  결과로 판단할 수 없다.

## 원시 결과

- 주 실행: `results/2026-08-15-one-sentence/run-2026-08-15-012346966Z.json`
- Gemini low: `results/2026-08-15-gemini-thinking-low/run-2026-08-15-012630068Z.json`
- Luna none/Flash-Lite: `results/2026-08-15-luna-none-flash-lite/run-2026-08-15-013318487Z.json`
- 최소 reasoning 재측정: `results/2026-08-15-min-reasoning/run-2026-08-15-013639009Z.json`
- Gemini 3.6 Flash: `results/2026-08-15-gemini-36/run-2026-08-15-020934846Z.json`
- 비교 기준: `results/run-2026-07-09-175609197Z.json`,
  `results/run-2026-07-10-015213726Z.json`, `results/run-2026-05-14-064224261Z.json`
