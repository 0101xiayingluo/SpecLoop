# Model capability and degradation policy

## Product judgment

SpecLoop routes by task risk, not by a permanently hard-coded vendor model. A cheaper flagship may change which deployment model is mapped to `small` or `large`; it does not remove evidence grounding, blast-radius isolation, fallback, or human authority.

The repository currently defaults to `gpt-5-mini` only as deployment configuration. `OPENAI_MODEL_SMALL` and `OPENAI_MODEL_LARGE` are the actual tier boundaries. Model names, prices, availability, and latency must be re-verified against the deployment account before a release.

## Executable degradation matrix

| Scene | Primary path | Fallback path | Hard trigger | Product shape after degradation |
| --- | --- | --- | --- | --- |
| Simple clarification | Deterministic baseline; no model call | Same synchronous flow | No high-severity finding or explicit conflict | One-question ceiling, zero marginal model tokens |
| Complex analysis | Configured `small` tier | Deterministic findings + human review | Provider unavailable, schema invalid, or unknown evidence ID | Keep output usable, show fallback, require confirmation |
| High-risk change | Configured `large` tier + mandatory human gate | Deterministic evidence index + direct manual review | Any guard failure, grounding below 100%, or trace faithfulness below 100% | Block autonomous progression; AI can organize evidence but cannot approve |

The implementation is `src/core/modelPolicy.ts`; the three boundary cases are regression-tested.

## Why high-risk still uses a model before approval

The model can reduce review effort by organizing conflicting evidence, proposing high-information questions, and surfacing affected nodes. It never owns the final decision. This division preserves useful model assistance while keeping acceptance authority with a person. When the model path fails a hard guard, the system retains the evidence index and skips directly to manual review.

## What if the flagship price drops 80%?

Re-run the same labeled quality set and live latency/cost evaluation. If the large tier is equal or better on quality and meets latency/cost gates, complex traffic may move to it and the small/large split may collapse. The simple deterministic route can still be preferable for reproducibility and zero marginal Token cost. High-risk approval remains because price does not change business liability.

## What if the hosted model becomes unavailable?

1. Simple requests are unaffected.
2. Complex requests keep deterministic findings and require human confirmation.
3. High-risk requests enter direct manual review; the system blocks autonomous progression.
4. A replacement model, including Doubao or a local 7B model, must pass the same schema, grounding, trace and routing gates before receiving traffic.

## Doubao or local 7B decision matrix

No unmeasured vendor capability is asserted. The product changes according to observed gates:

| Observed result | Eligible tier | Product response |
| --- | --- | --- |
| Passes schema, 100% grounding/trace gates and labeled route gate | candidate `small` or `large` | Shadow traffic first; promote by measured quality, P95 and cost |
| Grounding passes but long-input recall falls | bounded `small` | Split by source/topic, retrieve reviewed examples, shorten context |
| Multi-step or citation reliability misses a gate | no reasoning tier | Model only rewrites deterministic candidate questions |
| Any high-risk release gate fails | none | Direct human review with deterministic evidence index |

The credible experiment is a controlled head-to-head on the same anonymized corpus, not a claim that one vendor is inherently better at Chinese, long context, tool use, or reasoning.

### Replacement-model promotion protocol

1. Freeze one anonymized, route-stratified corpus and its human-reviewed expected findings, citations and questions.
2. Run the incumbent and candidate with identical schema, evidence and maximum-question contracts; record model version, prompt version, Token usage, P50/P95 latency and every guard failure.
3. Start with shadow traffic. A candidate cannot receive complex traffic if grounding, trace or routing gates regress, even if it is cheaper.
4. Promote tier mappings through versioned configuration. Any high-risk gate failure returns that route to `manual-review` and creates a reviewed failure sample.

This protocol is planned validation infrastructure. No Doubao or local-model production migration has been run in this repository.

## Current OpenAI documentation limitation

During this update, the current official OpenAI model page could not be accessed from the browser environment. A bundled non-authoritative fallback mentioned GPT-5.6 family roles, but it is not used to change deployment model IDs, prices, availability, or defaults. Those must be checked against current official OpenAI documentation and the deployment account before configuration.
