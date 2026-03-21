---
title: LM Review Request – AIP-1, ADP-1, PVS-1, CTX-1
status: Draft
audience: Claude, Gemini, and other LMs with repo access
created: 2025-12-10
---

## Context

You are reviewing the **Agent Control Layer (ACL)** codebase and its emerging standards for:

- **Agent identity** (AIP-1, X.509-based)
- **Agent work traces** (ADP-1, “Universal Adapter”)
- **Policy verdicts** (PVS-1, The Sentry)
- **Capability & Trust Context** (CTX-1, mapping to AIP/ADP)

The goal is to:

1. Validate that the specs are coherent and practical for real-world agent systems.
2. Identify missing fields or edge cases.
3. Suggest small, high-leverage improvements that make interop with other frameworks (LangChain, CrewAI, AutoGen, LangGraph, etc.) easier.

ACL’s north star is to be the **security and control plane** for agents – not just another framework. These specs are the core “moat” primitives.

## Documents to Read First

Please read these, in roughly this order:

1. `docs/specs/AIP-1.md` — Agent Identity Protocol (cryptographic identity, X.509 extensions).
2. `docs/specs/ADP-1.md` — Agent Data Protocol (Universal Adapter for Agent Work).
3. `docs/specs/PVS-1.md` — Policy Verdict Schema (The Sentry’s output format).
4. `docs/specs/CTX-1.md` — Capability & Trust Context (standard capability strings).

Helpful supporting docs:

- `docs/DEEP_MOAT_LAUNCH_KIT.md` — Product/marketing view of “Deep Moat”.
- `docs/RFC_ANNOUNCEMENT.md` — AIP-1 announcement and motivation.
- `docs/TECHNICAL_FEATURES.md` — High-level technical positioning.
- `lib/workflows/agent-executor.ts` — Core agent execution pipeline (Shadow Mode, The Sentry, identity issuance).
- `lib/agents/the-sentry.ts` — Policy engine implementation.
- `lib/security/identity/ca.ts`, `lib/security/identity/verifier.ts` — AIP reference implementation (cert issuing & verification).
- `lib/security/audit/audit-log-immutability.ts` — Tamper-evident audit log chain.

You have access to the full repo; feel free to inspect any related modules.

## What We’re Asking You To Do

Please treat this as a **design review** for the standards layer, not a request to rewrite the codebase.

For each spec, answer the questions below. Be concrete and, where possible, give example JSON or field names.

### 1) AIP-1 – Agent Identity Protocol

Files:

- `docs/specs/AIP-1.md`
- `lib/security/identity/ca.ts`
- `lib/security/identity/verifier.ts`
- `scripts/publish-root-ca.ts`

Questions:

1. Are the chosen X.509 extensions (AIP OIDs) sufficient for a robust cross-platform agent identity?
   - Anything obviously missing (e.g., audience, environment, signing algorithms) that would be cheap to add now?
2. Does the short-lived cert + blockchain anchoring model feel practical and secure for typical deployments?
   - Any operational pitfalls you foresee (rotation, clock skew, TLS termination) that should be called out in the spec?
3. Is the way ACL currently uses AIP in code (mainly for fingerprint + capability set) coherent with the spec?
   - Are there fields we should start populating now to avoid regret later?

### 2) ADP-1 – Agent Data Protocol (Universal Adapter)

Files:

- `docs/specs/ADP-1.md`
- `lib/workflows/agent-executor.ts`
- `lib/security/audit/audit-log-immutability.ts`

Questions:

1. Does the **Action → Observation → Reflection** model, as defined, cleanly cover:
   - LangChain-style chains?
   - CrewAI-style multi-agent flows?
   - AutoGen / function-calling agents?
2. Looking at the ADP-1 `AgentRun` and `AgentStep` schemas:
   - Are there any **minimal additional fields** you would strongly recommend adding now (for example: parent/child step IDs, span IDs, cancellation reasons)?
   - Are any existing fields obviously redundant or too framework-specific?
3. If you were writing an adapter for your favorite agent framework:
   - Would you be able to emit ADP-1 without ugly hacks?
   - Where would you hit friction, and how would you adjust the spec to reduce it (while keeping it simple)?

### 3) PVS-1 – Policy Verdict Schema (The Sentry)

Files:

- `docs/specs/PVS-1.md`
- `lib/agents/the-sentry.ts`

Questions:

1. Is the PVS-1 verdict structure (`approved`, `reasoning`, `policy_violations`, `confidence_score`, optional `policy_set` and `metadata`) sufficient for:
   - Automated enforcement (block/allow)?
   - Human audit and explanation?
2. Are there **1–3 additional fields** you would add now that would dramatically improve downstream analysis (e.g., severity levels, violation IDs, remediation hints) without complicating the core too much?
3. Does embedding PVS-1 verdicts as ADP-1 steps (as shown in ADP-1 §5) feel natural and consistent?

### 4) CTX-1 – Capability & Trust Context

Files:

- `docs/specs/CTX-1.md`
- `lib/security/authorization/rbac.ts`
- `lib/security/identity/ca.ts`

Questions:

1. Does the capability naming convention and the reserved prefixes (`agent:`, `tenant:`, `service_account:`, `perm:`, `budget:`) feel:
   - Flexible enough for most platforms?
   - Clear enough that security/infra engineers will not be confused?
2. Given ACL’s RBAC model (resource/action pairs), are we missing any obvious capability shapes that would be useful (e.g., environment scoping, data classification, rate limits)?
3. Do you see any **foot-guns** in encoding permissions as static capability strings (e.g., revocation, dynamic context) that should be explicitly documented as “do not rely on this alone”?

### 5) Cross-Cutting / Big Picture

1. Looking at AIP-1 + ADP-1 + PVS-1 + CTX-1 together:
   - Do they feel cohesive, or do you see inconsistent concepts/terminology?
   - Are there any **small changes** that would significantly improve composability (e.g., making certain field names consistent across specs)?
2. From your perspective, what are the **highest-leverage additions** we could make to these specs **before launch**, without turning this into a six-month project?
3. Conversely, what ideas should we **explicitly defer** to a v2 (for example, signed ADP streams, full mTLS between agents, global policy languages), and mark as roadmap so we do not scope-creep launch?

## Output Format

Please structure your feedback as:

- A short **“Overall”** section (1–3 paragraphs).
- Then **per-spec sections** (AIP-1, ADP-1, PVS-1, CTX-1, Cross-Cutting), each with:
  - “Strengths”
  - “Gaps / Risks”
  - “Concrete Recommendations”

Where applicable, include example JSON snippets or field names. Focus on **small, high-impact changes** we can realistically implement in the short term.
