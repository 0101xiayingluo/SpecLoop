# Business hypothesis and north-star metric

## Commercial problem

SpecLoop does not claim that a fixed percentage of software rework comes from ambiguous requirements. The testable commercial hypothesis is narrower:

> Evidence-linked clarification reduces requirement-caused reopening during delivery enough to outweigh model and human review cost.

The buyer would be a product/engineering team that already spends review time reconciling meetings, feedback, requirements and acceptance criteria. The product creates value only when avoided rework exceeds the cost of running and reviewing the Agent.

## North star

```text
rework-free delivery rate =
  accepted requirement packages not reopened for requirement ambiguity
  / accepted requirement packages that reach delivery
```

This is a pilot metric, not a current result. SpecLoop does not yet track delivery completion or requirement-caused reopening, so the first commercial pilot must add these events.

### Rework event taxonomy

Only reopenings attributable to the accepted requirement package count against the north star:

| Event code | Definition | Counts as requirement rework |
| --- | --- | --- |
| `missing-constraint` | Delivery discovers an omitted performance, permission, compatibility, failure or data rule | Yes |
| `contradictory-requirement` | Accepted requirements or acceptance criteria cannot both be satisfied | Yes |
| `acceptance-gap` | The package lacks an observable rule needed to decide pass/fail | Yes |
| `implementation-defect` | The implementation violates a clear accepted requirement | No |
| `external-change` | A dependency, policy or environment changes after acceptance | No |
| `new-scope` | A stakeholder adds capability that was not part of the accepted package | No |

The reviewer selects an event code and links the reopened package. Disputed attribution remains excluded until resolved, preventing implementation bugs or genuine scope growth from being presented as clarification failures.

## Unit economics

```text
net value per accepted package =
  avoided requirement-rework hours × loaded hourly cost
  - model cost
  - human review time × loaded hourly cost
```

This formula answers “are we consuming or optimizing compute?” A more capable model is justified only when its incremental cost produces more avoided review/rework cost or a safer high-risk decision.

## Metric tree

| Role | Metric | Current status | Pilot decision rule |
| --- | --- | --- | --- |
| North star | Rework-free delivery rate | Not measured | Compare with the same team’s manual baseline |
| Leading | Median clarification questions | Instrumented | Median no more than 3; 5 remains the hard ceiling |
| Leading | Time to accepted requirement package | Not measured | Record intake, first review and acceptance timestamps |
| Quality guardrail | Evidence and trace coverage | 100% on reproducible demo | Must remain 100% |
| Risk guardrail | Human takeover and provider fallback rate | Schema ready | Report by route before setting a target |
| Economics guardrail | Model and review cost per accepted package | AgentRun telemetry ready | Measure distribution before optimizing the target |

## Pilot design

1. Use at least 20 anonymized course projects or public Issue discussions with a manual-control workflow.
2. Label requirement-caused reopenings separately from code defects, scope changes and external dependency failures.
3. Compare trace coverage, questions, review time, reopen rate and cost at the requirement-package level.
4. Segment simple, complex and high-risk routes so a blended average cannot hide expensive failure modes.
5. Do not claim causal improvement until the event taxonomy and comparison group are stable.

## Staged rollout plan

This is a proposed launch sequence, not a completed organization rollout:

1. **Shadow evaluation**: run SpecLoop beside the existing process without changing decisions; compare grounding, missed constraints, route errors, review time and estimated cost.
2. **Five-person pilot**: allow reviewed requirement packages for one small team; preserve manual acceptance and log every takeover, reopening and correction.
3. **Team expansion**: expand only when trace coverage remains 100%, high-risk misses do not regress, and the measured avoided rework value exceeds model plus review cost.

Each stage has an explicit stop decision. A failed quality or economics gate sends traffic back to shadow mode instead of being hidden in a blended average.

## Packaging hypothesis

- Free: deterministic local workflow, evidence graph and limited exports.
- Paid team tier: hosted model runs, shared review history, organization controls and reviewed regression assets.
- Pricing input: measured cost per accepted package and avoided review/rework value, not a guessed per-seat price.

This packaging is a hypothesis for discovery, not a launched plan.
