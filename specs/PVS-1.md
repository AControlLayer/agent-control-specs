---
spec: PVS-1
title: Policy Verdict Schema
subtitle: Standard Output for Policy Engines
author: AControlLayer (ACL) Team <specs@acontrollayer.com>
status: Withdrawn
withdrawn: 2026-08-05
type: Standards Track
category: Policy
created: 2025-12-10
updated: 2026-03-20
requires: ADP-1
replaces: None
---

# PVS-1: Policy Verdict Schema

## ⚠️ WITHDRAWN — 2026-08-05

**This specification is withdrawn and must not be implemented.**

It was published at RFC status seeking community feedback. A prior-art review found that [XACML 3.0](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html) and [OpenID AuthZEN](https://openid.net/wg/authzen/) already specifies this domain more completely. Continuing to develop this document would duplicate existing standards rather than add to them.

These documents also contain unresolved defects, at least one with security implications. They are withdrawn rather than corrected: correcting a specification that should not exist is not the right remedy, and a corrected version would still be a duplicate.

**No successor version is planned.** ACL's own work in this area now profiles existing standards instead of defining new ones. The text below is retained for the historical record only.

---

## Status of This Memo

This document specifies a standards track protocol for the Agent Control Layer ecosystem and requests discussion and suggestions for improvements. Distribution of this memo is unlimited.

## Abstract

The Policy Verdict Schema (PVS-1) defines a standard JSON structure for policy enforcement decisions produced by ACL's **The Sentry** (and compatible policy engines). It is designed to be:

- **Simple** enough to embed inside ADP-1 agent steps
- **Expressive** enough for security, compliance, and monitoring
- **Extensible** for future policy engines and additional metadata

## Table of Contents

1. [Terminology](#1-terminology)
2. [Schema](#2-schema)
3. [The Sentry Integration](#3-the-sentry-integration)
4. [Embedding in ADP-1](#4-embedding-in-adp-1)
5. [Security Considerations](#5-security-considerations)
6. [Conformance](#6-conformance)
7. [Future Work](#7-future-work)
8. [References](#8-references)
9. [Acknowledgments](#9-acknowledgments)

## 1. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

**Policy**: A rule or constraint that agent outputs must satisfy.

**Verdict**: The result of evaluating content against one or more policies.

**Policy Engine**: A system that evaluates content against policies and produces verdicts.

**The Sentry**: ACL's reference policy engine implementation.

## 2. Schema

A PVS-1 verdict is a single JSON object with the following fields:

```jsonc
{
  "version": "pvs-1",
  "decision": "allow",
  "approved": true,
  "reasoning": "Short explanation of the decision.",
  "policy_violations": [],
  "confidence_score": 0.97,
  "policy_set": ["No PII leakage", "No financial advice"],
  "metadata": {
    "engine": "the-sentry",
    "engine_version": "2.0.0",
    "latency_ms": 520,
    "tenant_id": "tenant-123",
    "agent_id": "coach"
  }
}
```

### 2.1 Required Fields

<!-- spec-contract:pvs-1-required-fields:start -->
| Field | Type | Presence | Schema description |
|---|---|---|---|
| `version` | string | required | Schema version identifier |
| `decision` | string | required | Policy decision: allow execution, deny execution, or escalate for human review |
| `approved` | boolean | required | True if content is allowed to proceed, false otherwise |
| `reasoning` | string | required | Human-readable explanation of the decision |
| `policy_violations` | array | required | Array of violated policy descriptions. Empty if approved is true. |
| `confidence_score` | number | required | Engine confidence in the verdict (0.0 to 1.0) |
| `policy_set` | array | optional | Array of policy names that were evaluated |
| `metadata` | object | optional | Engine-specific metadata |

**Decision values:**
- `allow`
- `deny`
- `escalate`

Consumers MUST ignore unknown keys in `metadata`.
<!-- spec-contract:pvs-1-required-fields:end -->

### 2.3 Constraints

<!-- spec-contract:pvs-1-constraints:start -->
- When `decision` is `allow`, `approved` MUST be `true` and `policy_violations` MUST be empty.
- When `decision` is `deny` or `escalate`, `approved` MUST be `false`.
- `confidence_score` MUST be between 0 and 1 inclusive.
- Confidence below 0.9 SHOULD result in `decision: "escalate"`.
<!-- spec-contract:pvs-1-constraints:end -->

## 3. The Sentry Integration

The Sentry (ACL's reference policy engine) uses this TypeScript interface:

<!-- spec-contract:pvs-1-typescript-interface:start -->
```typescript
type PolicyDecision = "allow" | "deny" | "escalate";

interface PolicyEvaluation {
  version: "pvs-1";
  decision: PolicyDecision;
  approved: boolean;
  reasoning: string;
  policy_violations: string[];
  confidence_score: number;
  policy_set?: string[];
  metadata?: {
    engine?: string;
    engine_version?: string;
    latency_ms?: number;
    tenant_id?: string;
    agent_id?: string;
  };
}
```
<!-- spec-contract:pvs-1-typescript-interface:end -->

The Sentry determines `decision` based on:

<!-- spec-contract:pvs-1-decision-rules:start -->
1. **Clear violation detected** → `decision: "deny"`
2. **No violations, confidence ≥ 0.9** → `decision: "allow"`
3. **Uncertain or confidence < 0.9** → `decision: "escalate"`
<!-- spec-contract:pvs-1-decision-rules:end -->

To produce PVS-1 compliant output, policy engines SHOULD:

- Add `version: "pvs-1"` to its JSON output
- Include `decision` with the appropriate value
- Derive `approved` from `decision` for backwards compatibility
- Include `policy_set` with evaluated policy names
- Include `metadata.engine` identifying the engine
- Include `metadata.engine_version` with semantic version
- Include `metadata.tenant_id` and `metadata.agent_id` when available

## 3.1 Escalation Handling

When a policy engine returns `decision: "escalate"`, the consuming system SHOULD route the verdict to a human review process. The specific implementation is left to the platform.

```
Content → Policy Engine → PVS-1 Verdict
                              ↓
                    decision === "allow"    → Proceed
                    decision === "deny"     → Block
                    decision === "escalate" → Human Review
                              ↓
                    Human Reviewer → Approve/Reject
```

<!-- spec-contract:pvs-1-escalation-triggers:start -->
**Recommended escalation triggers:**
- Confidence score below 0.9
- Ambiguous policy match
- High-stakes operation (configured per use case)
- Explicit policy requiring human review
- System uncertainty or error conditions
<!-- spec-contract:pvs-1-escalation-triggers:end -->

Platforms implementing PVS-1 SHOULD:
1. Pause execution when `decision === "escalate"`
2. Present the verdict to a human reviewer
3. Allow the reviewer to approve (proceed) or reject (block)
4. Log the human decision for audit purposes

## 4. Embedding in ADP-1

PVS verdicts are designed to embed directly inside ADP-1 steps as `observation.output`:

```jsonc
{
  "action": {
    "type": "tool_call",
    "name": "policy_judge",
    "input": {
      "draft_output": "...",
      "policies": ["No PII", "No financial advice"]
    }
  },
  "observation": {
    "type": "tool_result",
    "output": {
      "version": "pvs-1",
      "decision": "deny",
      "approved": false,
      "reasoning": "Draft contained direct SSN.",
      "policy_violations": ["No PII"],
      "confidence_score": 0.98,
      "policy_set": ["No PII", "No financial advice"],
      "metadata": {"engine": "the-sentry", "latency_ms": 650}
    }
  }
}
```

This enables downstream systems to:
- Enforce decisions (block/allow/escalate)
- Route uncertain verdicts to human reviewers
- Aggregate policy violation statistics
- Audit and explain why output was blocked or escalated

## 5. Security Considerations

### 5.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Verdict Tampering** | Sign verdicts; store in immutable audit log |
| **Policy Bypass** | Enforce verdicts at policy enforcement points |
| **False Negatives** | Use confidence_score thresholds; human review for low confidence |
| **Information Leakage** | Redact sensitive content from reasoning field |

### 5.2 Verdict Integrity

- Verdicts SHOULD be signed when stored or transmitted
- Systems MUST NOT allow agents to modify their own verdicts
- Audit logs SHOULD include original content hash alongside verdict

### 5.3 Confidence Thresholds

Implementations SHOULD define confidence thresholds:
<!-- spec-contract:pvs-1-security-threshold:start -->
- `confidence_score >= 0.9`: the policy decision MAY be auto-enforced.
- `confidence_score < 0.9`: the verdict SHOULD be queued for human review.
<!-- spec-contract:pvs-1-security-threshold:end -->

## 6. Conformance

### 6.1 Conformance Levels

<!-- spec-contract:pvs-1-conformance:start -->
**Level 1 (Core)**: An implementation MUST:
- Emit valid JSON conforming to this schema
- Include all schema-required fields
- Enforce decision, approved, and policy_violations consistency
- Use the schema-defined confidence_score range

**Level 2 (Extended)**: An implementation MUST also:
- Include policy_set with evaluated policies
- Include metadata.engine identifying the policy engine
- Provide meaningful reasoning text

**Level 3 (Complete)**: An implementation MUST also:
- Include metadata.latency_ms for performance monitoring
- Support verdict signing for integrity
- Integrate with ADP-1 step embedding
<!-- spec-contract:pvs-1-conformance:end -->

### 6.2 Schema Validation

A JSON Schema for PVS-1 is provided at `schemas/pvs-1.schema.json`. Conforming implementations SHOULD validate verdicts against this schema.

## 7. Future Work

- **Structured Violations**: Objects with IDs, severities, remediation hints
- **Policy Categories**: `privacy`, `financial`, `safety` taxonomies
- **Policy Links**: References to machine-readable policy definitions
- **Escalation Priority**: Levels like `urgent`, `normal`, `low` for triaging human review

## 8. References

### 8.1 Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017.
- **[RFC8259]** Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, December 2017.

### 8.2 Informative References

- **[ADP-1]** AControlLayer, "Agent Data Protocol", ADP-1, 2025.

## 9. Acknowledgments

The authors thank the early reviewers and implementers who provided feedback on this specification.

---

_Copyright 2025 AControlLayer. Released under the [MIT License](../LICENSE)._
