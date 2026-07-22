---
spec: AIP-1
title: Agent Identity Protocol
subtitle: The Standard for Autonomous Trust
author: AControlLayer (ACL) Team <specs@acontrollayer.com>
status: Request for Comment (RFC)
type: Standards Track
category: Identity
created: 2025-12-09
updated: 2025-12-14
requires: None
replaces: None
---

# AIP-1: Agent Identity Protocol

## Status of This Memo

This document specifies a standards track protocol for the Agent Control Layer ecosystem and requests discussion and suggestions for improvements. Distribution of this memo is unlimited.

## Abstract

The Agent Identity Protocol (AIP) establishes a universal standard for the cryptographic identification, verification, and authorization of Autonomous AI Agents. It moves the industry beyond API keys and static tokens toward a **Zero Trust** model based on short-lived, verifiable X.509 certificates anchored to a public blockchain. This protocol enables a secure, interoperable "Agent Marketplace" where agents from disparate platforms can safely collaborate, transact, and enforce policy without prior trust.

## Table of Contents

1. [Terminology](#1-terminology)
2. [Motivation](#2-motivation)
3. [Specification](#3-specification)
4. [Trust Architecture](#4-trust-architecture)
5. [Marketplace Interoperability](#5-marketplace-interoperability)
6. [Security Considerations](#6-security-considerations)
7. [Conformance](#7-conformance)
8. [Future Work](#8-future-work)
9. [Reference Implementation](#9-reference-implementation)
10. [References](#10-references)
11. [Acknowledgments](#11-acknowledgments)

## 1. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

**Agent**: An autonomous software process capable of taking actions on behalf of a user or organization.

**Certificate Authority (CA)**: An entity that issues X.509 certificates.

**Root CA**: The top-level CA whose public key hash is anchored to a blockchain.

**Verifier**: A service or peer that validates an agent's certificate.

**Capability**: A permission or authorization granted to an agent, encoded as a CTX-1 string.

## 2. Motivation

As AI Agents transition from chat interfaces to autonomous actors capable of financial transactions and infrastructure mutation, the current identity model (API Keys, OAuth User Tokens) is insufficient.

1. **Identity Crises**: An agent is not a user. An agent is a software process acting _on behalf_ of a user, but with distinct constraints.
2. **No Interoperability**: An agent on "Platform A" has no way to prove its identity or capabilities to an agent on "Platform B".
3. **The Marketplace Problem**: To build a global economy of agents, we need a standard "Passport" that proves an agent is who they say they are, and that they are "good standing" members of a trusted network.

## 3. Specification

The AIP relies on **Mutual TLS (mTLS)** and **X.509 v3 Certificates** with custom extensions.

### 3.1 The Agent Certificate Profile

All AIP-compliant agents MUST identify themselves using an X.509 Certificate that adheres to the following profile.

#### 3.1.1 Subject Distinguished Name (DN)

The `Subject` field MUST uniquely identify the agent. Implementations MAY choose how much semantics to encode in the DN itself vs. custom extensions. A RECOMMENDED profile is:

- `CN` (Common Name): The unique Agent ID (UUID or stable key).
- `O` (Organization): The Tenant or Platform Name (e.g., "Acme Corp").
- `OU` (Organizational Unit): The Agent Role (e.g., "Level 2 Support").

The ACL reference implementation primarily encodes semantics in custom AIP extensions (below) and uses `CN="Agent:<id>"` with static `O`/`OU` values for internal agents.

#### 3.1.2 Custom AIP Extensions (OIDs)

We define the `1.3.6.1.4.1.59999` (Private Enterprise Number - Placeholder for ACL) arc for AIP specific data.

> **Note on IANA Assignment:**
> The OID arc `59999` is currently used for RFC/Draft purposes. A dedicated Private Enterprise Number (PEN) will be assigned by IANA for the v1.0 release.

<!-- spec-contract:aip-1-extensions:start -->
| OID | Name | Data Type | Description | Value Rule |
| :--- | :--- | :--- | :--- | :--- |
| `1.3.6.1.4.1.59999.1.1` | **AIP-Version** | `INTEGER` | Protocol version (e.g., `1`). | MUST equal the AIP protocol version 1. |
| `1.3.6.1.4.1.59999.1.2` | **Agent-Role** | `UTF8String` | Semantic role (e.g., `researcher`, `market-maker`). | MUST be a non-empty semantic role name. |
| `1.3.6.1.4.1.59999.1.3` | **Tenant-ID** | `UTF8String` | The UUID of the owner/tenant (`tenant_id`). | MUST be a canonical UUID tenant identifier. |
| `1.3.6.1.4.1.59999.1.4` | **Capability-Set** | `IA5String` | JSON array of approved capabilities (e.g., `["perm:files:read", "agent:trade:execute"]`). | MUST be a JSON array of unique CTX-1-conformant capability strings; unknown prefixes remain valid and are ignored by consumers that do not understand them. |
| `1.3.6.1.4.1.59999.1.5` | **Anchor-Chain** | `UTF8String` | Blockchain used for Root Trust (e.g., `ethereum:sepolia`). | MUST be a non-empty trust-anchor chain identifier. |
| `1.3.6.1.4.1.59999.1.6` | **AIP-Audience** | `UTF8String` | Intended verifier / audience (e.g., `api.acme.com`). | MUST be a non-empty intended verifier identifier. |
| `1.3.6.1.4.1.59999.1.7` | **AIP-Environment** | `UTF8String` | Deployment environment (`production`, `staging`, `development`, etc.). | MUST be a non-empty deployment environment name. |
<!-- spec-contract:aip-1-extensions:end -->

#### 3.1.3 Validity Period

<!-- spec-contract:aip-1-lifetime:start -->
- **Maximum Validity**: 15 minutes.
- **RECOMMENDED Validity**: 5 minutes.
- **Clock Skew Tolerance**: Issuers SHOULD backdate the `notBefore` time by 1–2 minutes to account for clock skew. Verifiers SHOULD allow a grace period of ±60 seconds when enforcing validity, and all participating systems MUST synchronize to NTP with drift <30 seconds.
<!-- spec-contract:aip-1-lifetime:end -->
- **Reasoning**: Short-lived certificates render revocation lists (CRLs) largely unnecessary, significantly reducing infrastructure complexity ("Blast Radius Reduction").

#### 3.1.4 Environment and Audience

- **AIP-Environment** (`.7`) MUST reflect the deployment environment in which the cert is valid (e.g., `production`, `staging`, `development`). Verifiers SHOULD reject certificates whose environment does not match their own.
- **AIP-Audience** (`.6`) MAY be used to scope certificates to a specific verifier or service (e.g., `api.acme.com`). When present, verifiers SHOULD ensure that the audience matches their configured identity (similar to OIDC `aud` checks).

## 4. Trust Architecture

Trust is established through the "Verification Triangle":

1. **The Agent (Prover)**: Holds the private key and Certificate.
2. **The Verifier (Service/Peer)**: Validates the Certificate signature.
3. **The Anchor (Blockchain)**: The public immutable ledger that stores the **Hash of the Root CA**.

### 4.1 The Anchoring Process

To become a trusted "Identity Provider" (IdP) in the AIP network:

1. Generate a Root CA.
2. Calculate `SHA-256(Root_CA_Public_Key)`.
3. Publish this hash to a recognized blockchain (e.g., Ethereum) to a smart contract or as a transaction payload.
4. This creates a **Time-Stamped Proof of Existence**.

### 4.2 The Verification Process

When Agent A connects to Agent B:

1. **Handshake**: Perform standard TLS Handshake requesting Client Certificate.
2. **Chain Validation**: Agent B validates Agent A's cert path to the Root CA.
3. **Public Check**: Agent B (optionally) queries the Blockchain. "Does this Root CA hash exist on-chain?"
4. **Claim Inspection**: Agent B parses the `Capability-Set` OID. "Is Agent A allowed to `execute_trade`?"
5. **Environment / Audience Check**: Agent B validates that the `AIP-Environment` matches its own environment and, if present, that `AIP-Audience` includes or equals its configured service identity.

> **Note on Load Balancers and TLS Termination**  
> In many deployments, mutual TLS is terminated at a load balancer or edge proxy. In this topology, the verifier logic runs behind the LB and receives the client certificate (or a hash thereof) via trusted headers (e.g., `X-Client-Cert`, `X-Client-Cert-Hash`). Implementations MUST only trust these headers if they are injected by a trusted front-end and MUST still perform full AIP verification (signature, validity period, environment, audience, and Capability-Set) against the forwarded certificate data.

## 5. Marketplace Interoperability

AIP enables a decentralized marketplace. An agent from **Company X** can hire an agent from **Company Y** without API key integration.

**The Flow:**

1. **Discovery**: Company X finds "Tax Bot" (Company Y) in a registry.
2. **Connection**: Company X initiates mTLS to Company Y's endpoint.
3. **Payment**: Company X includes a "Payment-Token" or "Budget-Proof" in the `Capability-Set` extension.
4. **Execution**: Company Y's agent verifies the budget and executes the task.

## 6. Security Considerations

### 6.1 Threat Model

AIP is designed to mitigate the following threats:

| Threat | Mitigation |
|--------|------------|
| **Credential Theft** | Short-lived certificates (5-15 min) limit exposure window |
| **Impersonation** | mTLS requires possession of private key |
| **Capability Escalation** | Capabilities are cryptographically bound to certificate |
| **Replay Attacks** | Certificate validity period prevents reuse |
| **Man-in-the-Middle** | TLS provides channel encryption and authentication |
| **Root CA Compromise** | Blockchain anchor enables detection; short cert lifetime limits damage |

### 6.2 Key Management

- Private keys for agent certificates SHOULD be generated on the agent host and MUST NOT be transmitted.
- Root CA private keys MUST be stored in Hardware Security Modules (HSMs) or equivalent secure enclaves.
- Intermediate CAs SHOULD be used to limit Root CA exposure.

### 6.3 Blockchain Anchor Security

- The blockchain anchor provides integrity verification, not confidentiality.
- Implementers SHOULD monitor the anchor chain for unauthorized Root CA publications.
- Multiple blockchain anchors MAY be used for redundancy.

### 6.4 Residual Risks

- **Compromised Agent Host**: If an agent's host is compromised, the attacker can use the certificate until expiry. Mitigation: Use shortest practical validity period.
- **Clock Manipulation**: Systems with manipulated clocks may accept expired certificates. Mitigation: Enforce NTP synchronization requirements.

## 7. Conformance

### 7.1 Conformance Levels

<!-- spec-contract:aip-1-conformance:start -->
**Level 1 (Core)**: An implementation MUST:
- Issue X.509 v3 certificates with validity ≤ 15 minutes
- Include AIP-Version (OID `1.3.6.1.4.1.59999.1.1`) in all certificates
- Include Tenant-ID (OID `1.3.6.1.4.1.59999.1.3`) in all certificates
- Include Capability-Set (OID `1.3.6.1.4.1.59999.1.4`) in all certificates
- Validate certificate signatures and expiration

**Level 2 (Extended)**: An implementation MUST also:
- Include AIP-Environment (OID `1.3.6.1.4.1.59999.1.7`) in all certificates and validate environment matching
- Include AIP-Audience (OID `1.3.6.1.4.1.59999.1.6`) when certificates are scoped
- Support NTP synchronization with <30 second drift

**Level 3 (Complete)**: An implementation MUST also:
- Anchor Root CA to blockchain
- Support on-chain verification of Root CA fingerprint
- Implement full CTX-1 capability vocabulary
<!-- spec-contract:aip-1-conformance:end -->

### 7.2 Conformance Statement

Implementations MAY claim conformance as:

> "This implementation conforms to AIP-1 Level [1|2|3]."

## 8. Future Work

### 8.1 Quantum Readiness

AIP v1.0 relies on RSA/ECDSA. AIP v2.0 will introduce support for **Dilithium** or **Kyber** (Post-Quantum Cryptography) simply by updating the allowed algorithms in the cipher suite. The protocol structure (X.509 OIDs) is algorithm-agnostic.

### 8.2 Privacy (Zero-Knowledge)

Future iterations may allow ZK-Proofs within the `Capability-Set` OID, allowing an agent to prove "I am over 21" or "I am accredited" without revealing the underlying Tenant ID.

## 9. Reference Implementation

The **Agent Control Layer (ACL)** serves as the canonical reference implementation of AIP.

- **CA Logic**: `lib/security/identity/ca.ts`
- **Verifier**: `lib/security/identity/verifier.ts`
- **Anchoring Script**: `scripts/publish-root-ca.ts` (anchors Root CA fingerprint to Ethereum Sepolia)

### 9.1 Implementation Status (ACL v2.1)

The current ACL implementation conforms to AIP-1 Level 2 with the following behaviors:

- **Short-Lived Certificates**: Agent certificates are issued with a configurable lifetime, clamped between 1 and 15 minutes (default 5).
- **AIP Extensions**:
  - `AIP-Version` (`.1`): Hardcoded to `"1"` for all issued certificates.
  - `Agent-Role` (`.2`): Populated from the logical agent key (e.g., `"analyst"`, `"coach"`) when available.
  - `Tenant-ID` (`.3`): Populated with the tenant identifier when the issuing context provides it.
  - `Capability-Set` (`.4`): Populated as a JSON array. By default, ACL embeds coarse-grained capabilities such as `["agent:<id>", "tenant:<id>", "service_account:<id>"]` and may be extended with more granular permissions.
  - `Anchor-Chain` (`.5`): Set to `"ethereum:sepolia"` to reflect the default anchoring chain used by `scripts/publish-root-ca.ts`.
- **Verification**:
  - Runtime verification currently checks signature validity, certificate lifetime, and derives the Agent ID from the `CN` field.
  - On-chain verification of the Root CA fingerprint is defined but intentionally **not** executed on the hot path yet. Operators can use `scripts/publish-root-ca.ts` and future tooling for offline/periodic verification.

Future releases will expand how ACL maps internal RBAC permissions into the `Capability-Set` and may introduce optional mTLS handshakes between agents based directly on AIP certificates.

## 10. References

### 10.1 Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, DOI 10.17487/RFC2119, March 1997.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, DOI 10.17487/RFC8174, May 2017.
- **[RFC5280]** Cooper, D., et al., "Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile", RFC 5280, May 2008.
- **[RFC8446]** Rescorla, E., "The Transport Layer Security (TLS) Protocol Version 1.3", RFC 8446, August 2018.

### 10.2 Informative References

- **[CTX-1]** AControlLayer, "Capability & Trust eXtensions", CTX-1, 2025.
- **[ADP-1]** AControlLayer, "Agent Data Protocol", ADP-1, 2025.

## 11. Acknowledgments

The authors thank the early reviewers and implementers who provided feedback on this specification.

---

_Copyright 2025 AControlLayer. Released under the [MIT License](../LICENSE)._
