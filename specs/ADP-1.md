---
spec: ADP-1
title: Agent Data Protocol
subtitle: Universal Adapter for Agent Work
author: AControlLayer (ACL) Team <specs@acontrollayer.com>
status: Request for Comment (RFC)
type: Standards Track
category: Data
created: 2025-12-10
updated: 2025-12-14
requires: AIP-1, CTX-1
replaces: None
---

# ADP-1: Agent Data Protocol

## Status of This Memo

This document specifies a standards track protocol for the Agent Control Layer ecosystem and requests discussion and suggestions for improvements. Distribution of this memo is unlimited.

## Abstract

The Agent Data Protocol (ADP-1) defines a standard JSON representation for **Agent Work**: how an agent receives tasks, takes actions, observes results, reflects, and produces final outputs. The goal is to provide a **framework-agnostic wire format** for agent runs so that tools like LangChain, CrewAI, AutoGen, LangGraph, and custom frameworks can all interoperate on a shared control plane.

ADP-1 is designed to pair with the **Agent Identity Protocol (AIP-1)**:

- AIP-1 answers: **"Who is this agent and what are they allowed to do?"**
- ADP-1 answers: **"What exactly did this agent do?"**

Together, they allow platforms like Agent Control Layer (ACL) to provide cross-framework security, policy enforcement, monitoring, and analytics for autonomous agents.

## Table of Contents

1. [Terminology](#1-terminology)
2. [Design Goals](#2-design-goals)
3. [Core Concepts](#3-core-concepts)
4. [Relationship to AIP-1](#4-relationship-to-aip-1)
5. [Policy Verdicts](#5-policy-verdicts)
6. [Extension Points](#6-extension-points)
7. [Security Considerations](#7-security-considerations)
8. [Conformance](#8-conformance)
9. [Reference Implementation](#9-reference-implementation)
10. [Future Work](#10-future-work)
11. [References](#11-references)
12. [Acknowledgments](#12-acknowledgments)

## 1. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

**Agent Run**: A complete execution instance of an agent performing a task from start to completion.

**Agent Step**: A single unit of work within a run, consisting of Action, Observation, and optional Reflection.

**Action**: An operation performed by the agent (tool call, message, inference, etc.).

**Observation**: The result or feedback from an action.

**Reflection**: The agent's reasoning about the observation and next steps.

## 2. Design Goals

1. **Framework Agnostic** — Support LangChain, CrewAI, AutoGen, custom agents, etc. without privileging any one framework.
2. **Minimal but Extensible** — Small core schema (Action → Observation → Reflection), with well-defined extension points.
3. **AIP-Aware** — Every run and step is tied back to cryptographic identity (AIP-1) without requiring consumers to understand PKI details.
4. **Streaming-Friendly** — Structured so events can be emitted incrementally during a run.
5. **Audit & Control Ready** — Suitable for security analytics, policy enforcement (e.g., The Sentry), and tamper-evident audit chains.

## 3. Core Concepts

ADP defines two primary objects:

- **Agent Run** — A full execution instance of an agent performing work.
- **Agent Step** — A single Action → Observation → Reflection unit within that run.

### 3.1 Agent Run

An **Agent Run** represents one end-to-end execution of an agent for a given task.

```jsonc
{
  "version": "adp-1",
  "run_id": "e7e5c9a4-1c6f-4e4e-9a9a-52f9f0d7e0f1",
  "tenant_id": "tenant-123",
  "trace": {
    "trace_id": "0af7651916cd43dd8448eb211c80319c",
    "span_id": "b7ad6b7169203331",
    "parent_span_id": "0000000000000000"
  },
  "agent": {
    "agent_id": "coach",
    "agent_version": "v3",
    "framework": "acl",
    "framework_run_id": "abc123",
    "aip": {
      "cert_fingerprint": "sha256:abc123...",
      "tenant_id": "tenant-123",
      "capabilities": ["agent:coach", "tenant:tenant-123"]
    }
  },
  "context": {
    "task_description": "Draft a security review summary",
    "workflow_key": "demo_workflow",
    "user_id": "user-456",
    "session_id": "sess-789",
    "labels": ["demo", "security_review"]
  },
  "steps": [],
  "final_output": {
    "type": "message",
    "content": "Here is your security review summary...",
    "format": "text/plain"
  },
  "status": "succeeded",
  "error": null,
  "started_at": "2025-12-10T19:00:00.000Z",
  "completed_at": "2025-12-10T19:00:12.345Z",
  "metadata": {
    "total_tokens": 1234,
    "total_cost_usd": 0.0123,
    "models_used": ["gpt-4.1", "gpt-4o-mini"]
  }
}
```

#### 3.1.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | MUST be `"adp-1"` for this spec |
| `run_id` | string | Globally unique ID for this run (UUID RECOMMENDED) |
| `tenant_id` | string | Logical tenant/customer identifier |
| `agent.agent_id` | string | Stable logical agent identifier |
| `agent.aip.cert_fingerprint` | string | SHA-256 fingerprint of AIP-1 certificate |
| `steps` | array | Array of AgentStep objects (MAY be empty) |
| `status` | string | One of: `succeeded`, `failed`, `cancelled`, `timeout` |
| `started_at` | string | ISO 8601 timestamp |
| `completed_at` | string | ISO 8601 timestamp |

All other fields are RECOMMENDED but OPTIONAL.

### 3.2 Agent Step

An **Agent Step** is the core unit of work: **Action → Observation → Reflection**.

```jsonc
{
  "index": 0,
  "parent_step_index": null,
  "timestamp": "2025-12-10T19:00:01.234Z",
  "action": {
    "type": "tool_call",
    "name": "web_search",
    "input": {"query": "AIP-1 Agent Identity Protocol summary"}
  },
  "observation": {
    "type": "tool_result",
    "output": {"results": [{"title": "AIP-1 Spec", "url": "https://..."}]},
    "error": null
  },
  "reflection": {
    "thought": "I found the spec; next I should summarize key properties.",
    "next_action_hint": "Summarize spec for user",
    "uncertainty": 0.2
  },
  "metadata": {
    "model": "gpt-4.1",
    "prompt_tokens": 123,
    "completion_tokens": 45,
    "latency_ms": 350
  }
}
```

#### 3.2.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `index` | integer | Zero-based step index |
| `timestamp` | string | ISO 8601 timestamp |
| `action.type` | string | Action type (see 3.2.2) |
| `observation.type` | string | Observation type (see 3.2.3) |

`reflection` and `metadata` are OPTIONAL but strongly RECOMMENDED.

#### 3.2.2 Action Types

| Type | Description |
|------|-------------|
| `tool_call` | Agent invoked a tool or function |
| `message` | Agent produced or consumed a message |
| `plan_update` | Agent updated its internal plan |
| `model_inference` | Direct LLM call |
| `other` | Framework-specific (use `metadata.action_subtype`) |

#### 3.2.3 Observation Types

| Type | Description |
|------|-------------|
| `tool_result` | Result from a tool/function call |
| `environment` | External environment feedback |
| `user_input` | Input from a human user |
| `error` | Error/exception details |
| `none` | No meaningful observation |

## 4. Relationship to AIP-1

ADP-1 is explicitly **AIP-aware** but does not require consumers to understand PKI. The `agent.aip` block bridges the two:

- `cert_fingerprint` — Matches the SHA-256 fingerprint of the AIP-1 X.509 certificate used during the run.
- `tenant_id` — Mirrors AIP `Tenant-ID` (`1.3.6.1.4.1.59999.1.3`).
- `capabilities` — Mirrors or derives from AIP `Capability-Set` (`1.3.6.1.4.1.59999.1.4`).

Implementations MAY include additional AIP-derived metadata in `agent` or `metadata`.

## 5. Policy Verdicts

ADP-1 RECOMMENDS representing policy verdicts (e.g., from The Sentry) as specialized steps:

```jsonc
{
  "index": 3,
  "timestamp": "2025-12-10T19:00:05.678Z",
  "action": {
    "type": "tool_call",
    "name": "policy_judge",
    "input": {"draft_output": "...", "policies": ["No PII"]}
  },
  "observation": {
    "type": "tool_result",
    "output": {
      "version": "pvs-1",
      "approved": false,
      "reasoning": "Draft contained direct SSN.",
      "policy_violations": ["No PII"],
      "confidence_score": 0.98
    }
  },
  "metadata": {"kind": "policy_verdict", "policy_engine": "the-sentry"}
}
```

The formal verdict schema is defined in [PVS-1](PVS-1.md).

## 6. Extension Points

ADP-1 is intentionally minimal. Implementations MAY extend:

- `agent.framework` and `agent.framework_run_id` for framework-specific identifiers
- `context` with arbitrary keys
- `metadata` at both run and step level, using namespaced keys (e.g., `openai.*`, `aws.*`)

Consumers MUST ignore unknown fields gracefully to maintain forwards compatibility.

## 7. Security Considerations

### 7.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Data Tampering** | Include AIP cert_fingerprint for verification; sign records |
| **Information Disclosure** | Implement access controls on ADP records |
| **Audit Evasion** | Immutable audit log storage; require all runs have ADP records |
| **Replay/Forgery** | Verify cert_fingerprint against AIP-1 certificates |

### 7.2 Data Sensitivity

ADP records MAY contain sensitive information in:
- `context.task_description` — User queries
- `steps[].action.input` — Tool inputs
- `steps[].observation.output` — Tool outputs
- `final_output.content` — Agent responses

Implementations MUST:
- Apply appropriate access controls to ADP records
- Consider data retention policies
- Redact sensitive fields when sharing externally

### 7.3 AIP Linkage Verification

Verifiers SHOULD:
- Validate that `agent.aip.cert_fingerprint` corresponds to a valid AIP-1 certificate
- Ensure the certificate was valid at `started_at` timestamp
- Check that `agent.aip.capabilities` match the certificate's Capability-Set

## 8. Conformance

### 8.1 Conformance Levels

**Level 1 (Core)**: An implementation MUST:
- Emit valid JSON conforming to the ADP-1 schema
- Include all required fields in Agent Run
- Include all required fields in Agent Step
- Use valid `status`, `action.type`, and `observation.type` values

**Level 2 (AIP-Integrated)**: An implementation MUST also:
- Populate `agent.aip.cert_fingerprint` from actual AIP-1 certificates
- Include `agent.aip.capabilities` derived from certificate
- Validate AIP linkage on record consumption

**Level 3 (Complete)**: An implementation MUST also:
- Emit step-level records for all agent actions
- Include `reflection` blocks with uncertainty scores
- Embed PVS-1 verdicts for policy-checked outputs

### 8.2 Schema Validation

A JSON Schema for ADP-1 is provided at `schemas/adp-1.schema.json`. Conforming implementations SHOULD validate records against this schema.

## 9. Reference Implementation

The ACL implementation provides the reference mapping:

| ADP Field | ACL Source |
|-----------|------------|
| `run_id` | `workflow_run.id` |
| `tenant_id` | `workflow_runs.tenant_id` |
| `agent.agent_id` | `agentKey` |
| `agent.aip.cert_fingerprint` | `agent_executions.crypto_identity` |
| `final_output` | `safeOutput` from agent-executor |
| `metadata.total_tokens` | Sum from `agent_executions` |

## 10. Future Work

- **Signed ADP Streams** — Sign records with AIP-1 certificates for tamper-evidence
- **Cross-Framework Tool Taxonomy** — Standard names for common tools
- **Richer Plan/Task Graphs** — Formal representation beyond linear steps

## 11. References

### 11.1 Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017.
- **[RFC8259]** Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, December 2017.

### 11.2 Informative References

- **[AIP-1]** AControlLayer, "Agent Identity Protocol", AIP-1, 2025.
- **[CTX-1]** AControlLayer, "Capability & Trust eXtensions", CTX-1, 2025.
- **[PVS-1]** AControlLayer, "Policy Verdict Schema", PVS-1, 2025.

## 12. Acknowledgments

The authors thank the early reviewers and implementers who provided feedback on this specification.

---

_Copyright 2025 AControlLayer. Released under the [MIT License](../LICENSE)._
