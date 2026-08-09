---
spec: CTX-1
title: Capability & Trust eXtensions
subtitle: Standard Capability Strings for AIP & ADP
author: AControlLayer (ACL) Team <specs@acontrollayer.com>
status: Withdrawn
withdrawn: 2026-08-05
type: Informational
category: Capabilities
created: 2025-12-10
updated: 2025-12-14
requires: None
replaces: None
---

# CTX-1: Capability & Trust eXtensions

## ⚠️ WITHDRAWN — 2026-08-05

**This specification is withdrawn and must not be implemented.**

It was published at RFC status seeking community feedback. A prior-art review found that [SPKI (RFC 2693, 1999)](https://www.rfc-editor.org/rfc/rfc2693.html) already specifies this domain more completely. Continuing to develop this document would duplicate existing standards rather than add to them.

These documents also contain unresolved defects, at least one with security implications. They are withdrawn rather than corrected: correcting a specification that should not exist is not the right remedy, and a corrected version would still be a duplicate.

**No successor version is planned.** ACL's own work in this area now profiles existing standards instead of defining new ones. The text below is retained for the historical record only.

---

## Status of This Memo

This document provides information for the Agent Control Layer community. It does not specify a standard but defines conventions that implementations SHOULD follow for interoperability. Distribution of this memo is unlimited.

## Abstract

The Capability & Trust eXtensions (CTX-1) defines a common vocabulary and naming convention for **capability strings** used in:

- AIP-1 `Capability-Set` X.509 extension
- ADP-1 `agent.aip.capabilities`

Its goals are:

- Provide a **stable, readable set of capability names** that map cleanly onto ACL's RBAC model
- Enable **cross-framework understanding** of what an agent is allowed to do
- Avoid overfitting to any single product or internal table structure

## Table of Contents

1. [Terminology](#1-terminology)
2. [Naming Convention](#2-naming-convention)
3. [Reserved Prefixes](#3-reserved-prefixes)
4. [Recommended Capabilities](#4-recommended-capabilities)
5. [RBAC Mapping](#5-rbac-mapping)
6. [Security Considerations](#6-security-considerations)
7. [Conformance](#7-conformance)
8. [Future Work](#8-future-work)
9. [References](#9-references)
10. [Acknowledgments](#10-acknowledgments)

## 1. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

**Capability**: A string representing a permission, identity, or constraint granted to an agent.

**Prefix**: The namespace portion of a capability string before the first colon.

**Qualifier**: Additional scoping after the capability name (e.g., resource type, limit).

## 2. Naming Convention

<!-- spec-contract:ctx-1-grammar:start -->
Capabilities are simple strings with the following pattern:

```text
<prefix>:<name>[:<qualifier>...]
```

**Examples:**
- `agent:coach`
- `tenant:tenant-123`
- `service_account:svc-xyz`
- `perm:workflows:read`
- `budget:usd:100`
- `env:production`
- `role:analyst`

**Rules:**

1. Segments MUST contain only lowercase ASCII letters, digits, `-`, or `_`
2. Names SHOULD be stable over time; when behavior changes significantly, prefer a new capability name
3. Unknown capabilities MUST be ignored (fail-safe) by consumers who do not understand them
4. Prefixes MUST NOT contain the `:` separator
5. The total string length SHOULD NOT exceed 256 characters
<!-- spec-contract:ctx-1-grammar:end -->

## 3. Reserved Prefixes

The following prefixes are reserved and SHOULD be interpreted consistently:

<!-- spec-contract:ctx-1-reserved-prefixes:start -->
| Prefix | Purpose | Examples |
|--------|---------|----------|
| `agent:` | Identifies a logical agent | `agent:coach`, `agent:analyst` |
| `tenant:` | Identifies a tenant/organization | `tenant:tenant-123` |
| `service_account:` | Identifies a backing service account | `service_account:svc-xyz` |
| `perm:` | Encodes an RBAC permission | `perm:workflows:read`, `perm:files:write` |
| `budget:` | Encodes budget constraints | `budget:usd:100`, `budget:tokens:100000` |
| `env:` | Encodes environment constraints | `env:production`, `env:staging` |
| `role:` | Encodes a role bundle | `role:analyst`, `role:admin` |
<!-- spec-contract:ctx-1-reserved-prefixes:end -->

Other prefixes MAY be defined by implementations as long as they do not conflict with the above.

## 4. Recommended Capabilities

### 4.1 Identity Capabilities

These identify the agent and its organizational context:

| Capability | Description |
|------------|-------------|
| `agent:<agent_key>` | Logical agent identifier (e.g., `agent:coach`) |
| `tenant:<tenant_id>` | Tenant/organization identifier |
| `service_account:<id>` | Backing service account (if applicable) |

### 4.2 Permission Capabilities

Format: `perm:<resource>:<action>`

| Capability | Description |
|------------|-------------|
| `perm:workflows:read` | Read workflow definitions |
| `perm:workflows:write` | Create/modify workflows |
| `perm:workflows:execute` | Execute workflows |
| `perm:inputs:read` | Read input data |
| `perm:inputs:write` | Write input data |
| `perm:files:read` | Read files |
| `perm:files:write` | Write files |
| `perm:secrets:read` | Read secrets (restricted) |

### 4.3 Constraint Capabilities

| Capability | Description |
|------------|-------------|
| `budget:usd:<amount>` | Maximum USD spend limit |
| `budget:tokens:<amount>` | Maximum token usage limit |
| `env:production` | Valid only in production |
| `env:staging` | Valid only in staging |

## 5. RBAC Mapping

ACL's RBAC model uses `{ resource: string; action: string }` pairs. The mapping to CTX-1 is:

```
RBAC { resource: "workflows", action: "read" }  →  "perm:workflows:read"
RBAC { resource: "inputs",    action: "write" } →  "perm:inputs:write"
```

**Guidelines:**

- Include only high-value, stable permissions as capabilities
- Avoid encoding highly dynamic or contextual permissions
- Implementation-specific permissions SHOULD use a namespaced prefix (e.g., `acl:internal:debug`)

## 6. Security Considerations

### 6.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Capability Escalation** | Capabilities are cryptographically bound to AIP-1 certificates |
| **Spoofing** | Verify capabilities against signed certificate |
| **Namespace Collision** | Use reserved prefixes; reject unknown prefixes in strict mode |
| **Information Disclosure** | Capability strings may reveal organizational structure |

### 6.2 Capability Validation

Verifiers SHOULD:
- Parse capability strings according to the naming convention
- Recognize and enforce reserved prefixes
- Reject malformed capabilities (missing prefix, invalid characters)
- Log unknown capabilities for monitoring

### 6.3 Least Privilege

- Agents SHOULD receive the minimum capabilities required
- Broad capabilities (e.g., `perm:*:*`) SHOULD NOT be issued
- Budget capabilities SHOULD have conservative limits

## 7. Conformance

### 7.1 Conformance Requirements

**Producers** (certificate issuers) MUST:
- Follow the naming convention in Section 2
- Use reserved prefixes correctly per Section 3
- Encode capabilities as a JSON array in AIP-1 Capability-Set

**Consumers** (verifiers) MUST:
- Parse capabilities according to the naming convention
- Ignore unknown capabilities (fail-safe)
- NOT grant access based solely on unrecognized capabilities

**Consumers** SHOULD:
- Validate capability format
- Log unknown capabilities for monitoring
- Support the full reserved prefix vocabulary

## 8. Future Work

- **Capability Categories**: Grouping (e.g., `perm:workflows:read` → category `data_read`)
- **Role Bundles**: `role:analyst` expands to a set of `perm:*` capabilities
- **Negative Capabilities**: `deny:files:write` for explicit denials
- **Capability Delegation**: Agent-to-agent capability transfer

## 9. References

### 9.1 Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017.

### 9.2 Informative References

- **[AIP-1]** AControlLayer, "Agent Identity Protocol", AIP-1, 2025.
- **[ADP-1]** AControlLayer, "Agent Data Protocol", ADP-1, 2025.

## 10. Acknowledgments

The authors thank the early reviewers and implementers who provided feedback on this specification.

---

_Copyright 2025 AControlLayer. Released under the [MIT License](../LICENSE)._
