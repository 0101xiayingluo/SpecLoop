# Evidence quality and provenance policy

## Purpose

SpecLoop preserves where a statement came from without treating the source label as proof that the statement is true. A GitHub Issue can contain speculation, while a meeting record can quote a directly confirmed constraint. Provenance supports audit; claim-level quality determines how the evidence may be used.

## Ingestion contract

Every accepted source stores `provenance`, `ingestionMethod`, a content `fingerprint`, and the original normalized text. Every evidence fragment stores a stable ID, source ID, quote and line range. Duplicate sources remain registered through `duplicateOf` but do not enter reasoning twice.

Current source types include user interviews, meetings, chats, product feedback, GitHub Issues, project documents and optional behavior logs. Supporting a source type means the user can label or upload it into the same traceable pipeline; it does not mean SpecLoop has a live connector to every external system.

## Claim-level quality dimensions

Source type is never a fixed trust ranking. Reviewers assess a claim using four independent dimensions:

| Dimension | Stronger signal | Weaker signal |
| --- | --- | --- |
| Verifiability | Observable behavior, artifact or explicit acceptance result | Opinion with no checkable outcome |
| Directness | First-party statement or original system event | Retelling or interpretation |
| Recency | Current release, policy or user workflow | Superseded context |
| Corroboration | Independent sources agree on the same claim | Single unsupported statement |

The MVP preserves the metadata needed for this review but does not yet calculate an automatic quality score. A future score must be calibrated on reviewed claims before it can affect routing or priority.

## Emotional language

Emotion is not discarded because it may indicate user pain or urgency. It is also not promoted to factual truth. For example, “this bug is ridiculous” may be retained as a user-intensity observation while the factual claim still requires a reproducible failure, behavior log or corroborating report.

The current MVP keeps the original quote and provenance but does not automatically infer an intensity score. Adding `userIntensity` is a pilot hypothesis that requires annotation guidance and reviewer-agreement measurement; it is not presented as a shipped classifier.

## Grounding and coverage gates

- Model findings may reference only evidence IDs in the current project allowlist.
- Every generated requirement and acceptance criterion must link at least one evidence ID that exists in the current project, and every cited ID must belong to that project.
- A non-empty list containing an unknown evidence ID does not count toward trace coverage and blocks entry into review.
- Evidence coverage proves traceability, not truth. Contradictory evidence remains visible until a human decision resolves it.

## Learning-loop policy

Provider failures, schema or grounding rejections, and material human corrections enter `pending-review`. A reviewer must accept a sample before it becomes a regression asset. Raw feedback never changes routing, prompts or model training automatically; this prevents noisy, malicious or incorrectly attributed evidence from contaminating the evaluation set.
