---
spec: SPEC-0
title: Specification Process
subtitle: Meta-Specification for ACL Standards
author: AControlLayer (ACL) Team <specs@acontrollayer.com>
status: Withdrawn
withdrawn: 2026-08-05
type: Informational
category: Process
created: 2025-12-14
updated: 2025-12-14
requires: None
replaces: None
---

# SPEC-0: Specification Process

## ⚠️ WITHDRAWN — 2026-08-05

**This meta-specification is withdrawn.**

SPEC-0 defined the process by which ACL specifications advanced through RFC, Candidate, and Final status. Every specification it governed — AIP-1, ADP-1, PVS-1, and CTX-1 — has been withdrawn, so it now governs nothing.

Leaving it published would imply an active specification program that no longer exists. ACL's work in this area profiles existing standards instead of defining new ones, and contributions to those standards follow their own processes rather than this one.

**No successor version is planned.** The text below is retained for the historical record only.

---

## Status of This Memo

This document defines the process for creating, reviewing, and maintaining Agent Control Layer (ACL) specifications. It is itself a specification and follows the format it defines.

## Abstract

SPEC-0 establishes the governance model, document structure, and lifecycle for all ACL specifications. It ensures consistency, quality, and interoperability across the specification suite.

## Table of Contents

1. [Terminology](#1-terminology)
2. [Specification Lifecycle](#2-specification-lifecycle)
3. [Document Structure](#3-document-structure)
4. [Numbering and Namespaces](#4-numbering-and-namespaces)
5. [Normative Language](#5-normative-language)
6. [Security Considerations](#6-security-considerations)
7. [Conformance](#7-conformance)
8. [References](#8-references)

## 1. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

**Specification**: A formal document defining a protocol, schema, or process.

**Editor**: A person responsible for maintaining a specification.

**Implementer**: A person or organization implementing a specification.

## 2. Specification Lifecycle

### 2.1 Stages

| Stage | Description |
|-------|-------------|
| **Draft** | Initial development; subject to major changes |
| **RFC** | Request for Comment; seeking community feedback |
| **Candidate** | Feature-complete; seeking implementation experience |
| **Final** | Stable; only errata changes permitted |
| **Superseded** | Replaced by a newer specification |

### 2.2 Progression

```
Draft -> RFC -> Candidate -> Final
                    |
                    v
               Superseded (by newer version)
```

### 2.3 Requirements for Advancement

**Draft to RFC**:
- Complete specification text
- At least one reference implementation

**RFC to Candidate**:
- Minimum 30-day review period
- Resolution of all substantive comments
- Two independent implementations

**Candidate to Final**:
- Minimum 60-day implementation period
- Demonstrated interoperability
- No normative changes in 30 days

## 3. Document Structure

All specifications MUST follow this structure:

### 3.1 Required Sections

1. **YAML Frontmatter** (see 3.2)
2. **Status of This Memo**
3. **Abstract**
4. **Table of Contents** (if > 3 sections)
5. **Terminology**
6. **Specification Body** (numbered sections)
7. **Security Considerations**
8. **Conformance Requirements**
9. **References**
10. **Copyright Notice**

### 3.2 Frontmatter Fields

```yaml
---
spec: [SPEC-NUMBER]        # Required: e.g., "AIP-1"
title: [Title]             # Required: Short title
subtitle: [Subtitle]       # Required: Descriptive tagline
author: [Author]           # Required: Name <email>
status: [Status]           # Required: Draft|RFC|Candidate|Final
type: [Type]               # Required: Standards Track|Informational
category: [Category]       # Required: Identity|Data|Policy|Capabilities|Process
created: [YYYY-MM-DD]      # Required: Creation date
updated: [YYYY-MM-DD]      # Required: Last update date
requires: [Dependencies]   # Required: List or "None"
replaces: [Specs]          # Required: List or "None"
---
```

### 3.3 Optional Sections

- **Acknowledgments**: Contributors and reviewers
- **Appendices**: Supplementary material
- **Revision History**: Inline change log

## 4. Numbering and Namespaces

### 4.1 Specification Prefixes

| Prefix | Category | Example |
|--------|----------|---------|
| AIP | Agent Identity Protocol | AIP-1 |
| ADP | Agent Data Protocol | ADP-1 |
| PVS | Policy Verdict Schema | PVS-1 |
| CTX | Capability & Trust eXtensions | CTX-1 |
| SPEC | Process/Meta | SPEC-0 |

### 4.2 Versioning

- Major version in spec number (e.g., AIP-1, AIP-2)
- Minor/patch versions in document metadata
- Breaking changes MUST increment major version

### 4.3 OID Namespace

ACL uses the Private Enterprise Number arc `1.3.6.1.4.1.59999` (placeholder).

| OID | Allocation |
|-----|------------|
| .1.x | AIP extensions |
| .2.x | Reserved for future use |
| .3.x | Reserved for future use |

## 5. Normative Language

### 5.1 RFC 2119 Keywords

Specifications MUST use RFC 2119 keywords for normative requirements:

- **MUST** / **REQUIRED** / **SHALL**: Absolute requirement
- **MUST NOT** / **SHALL NOT**: Absolute prohibition
- **SHOULD** / **RECOMMENDED**: Recommended but not required
- **SHOULD NOT** / **NOT RECOMMENDED**: Discouraged but not prohibited
- **MAY** / **OPTIONAL**: Truly optional

### 5.2 Usage Guidelines

- Use normative keywords ONLY for interoperability requirements
- Capitalize keywords when used normatively
- Include the terminology section citing RFC 2119

## 6. Security Considerations

All specifications MUST include a Security Considerations section addressing:

1. **Threat Model**: What attacks are in scope?
2. **Mitigations**: How does the spec address threats?
3. **Residual Risks**: What risks remain?
4. **Implementation Guidance**: Security best practices

## 7. Conformance

### 7.1 Conformance Levels

Specifications SHOULD define conformance levels:

- **Level 1 (Core)**: Minimum requirements for interoperability
- **Level 2 (Extended)**: Additional features for full compliance
- **Level 3 (Complete)**: All features including optional ones

### 7.2 Conformance Statements

Implementations MAY claim conformance using:

> "This implementation conforms to [SPEC-X] Level [N]."

## 8. References

### 8.1 Normative References

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017.

### 8.2 Informative References

- [EIP-1] Ethereum Improvement Proposals, "EIP Purpose and Guidelines"
- [RFC-STYLE] RFC Editor, "RFC Style Guide"

---

_Copyright 2025 AControlLayer. Released under the MIT License._
