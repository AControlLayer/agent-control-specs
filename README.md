[![Status: RFC](https://img.shields.io/badge/Status-RFC-blue?style=for-the-badge)](https://github.com/chrisbaber/agent-control-specs)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

# AControlLayer Standards

[![Specs Site](https://img.shields.io/badge/specs-live-gold)](https://specs.acontrollayer.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Blockchain](https://img.shields.io/badge/blockchain-sepolia-green)](https://sepolia.etherscan.io/tx/0x9349d41f0c92d128cbc07e8d4697a92fa7d107b2468c1f2fc0e9a3bc6c74a33a)

## The Problem: An Internet of Un-Governed Agents

As AI agents proliferate, the internet risks becoming a noisy, chaotic, and dangerous place. Without a standardized control layer, agents will struggle to trust one another. The **AControlLayer (ACL)** provides the missing infrastructure for identity, governance, and trust.

## Architecture Overview

The following diagram illustrates how the specifications relate to each other:

```mermaid
flowchart TB
    subgraph Identity ["Identity Layer"]
        AIP["AIP-1\nAgent Identity Protocol"]
        CA["Certificate Authority"]
        BC["Blockchain Anchor\n(Ethereum)"]
    end

    subgraph Capabilities ["Capabilities Layer"]
        CTX["CTX-1\nCapability Strings"]
    end

    subgraph Policy ["Policy Layer"]
        SENTRY["The Sentry\n(Policy Engine)"]
        PVS["PVS-1\nPolicy Verdicts"]
    end

    subgraph Data ["Data Layer"]
        ADP["ADP-1\nAgent Data Protocol"]
        AUDIT["Audit Trail"]
    end

    subgraph Runtime ["Agent Runtime"]
        AGENT["Autonomous Agent"]
    end

    CA -->|"Issues certificates"| AIP
    AIP -->|"Anchored to"| BC
    CTX -->|"Capability strings"| AIP
    AIP -->|"Identifies"| AGENT
    AGENT -->|"Actions evaluated"| SENTRY
    SENTRY -->|"Produces"| PVS
    CTX -->|"Capability checks"| SENTRY
    AIP -->|"cert_fingerprint"| ADP
    AGENT -->|"Work recorded"| ADP
    PVS -->|"Embedded in"| ADP
    ADP -->|"Persisted to"| AUDIT

    classDef identity fill:#e1f5fe,stroke:#01579b
    classDef caps fill:#fff3e0,stroke:#e65100
    classDef policy fill:#fce4ec,stroke:#880e4f
    classDef data fill:#e8f5e9,stroke:#1b5e20
    classDef runtime fill:#f3e5f5,stroke:#4a148c

    class AIP,CA,BC identity
    class CTX caps
    class SENTRY,PVS policy
    class ADP,AUDIT data
    class AGENT runtime
```

### Data Flow

1. **Identity Issuance**: CA issues short-lived X.509 certificates per AIP-1, embedding CTX-1 capability strings
2. **Blockchain Anchoring**: Root CA fingerprint anchored to Ethereum for trustless verification
3. **Agent Authorization**: Agents present certificates for mTLS; verifiers check capabilities
4. **Policy Evaluation**: The Sentry evaluates actions against policies, producing PVS-1 verdicts
5. **Audit Recording**: Agent work recorded via ADP-1, including AIP linkage and policy verdicts

## Quickstart

Want to see the specs in action? Try the interactive validators:

👉 **[specs.acontrollayer.com/validator](https://specs.acontrollayer.com/validator)**

Or validate your implementation programmatically via our API endpoint:

```bash
curl -X POST https://specs.acontrollayer.com/api/validate/adp \
  -H "Content-Type: application/json" \
  -d @your-agent-run.json
```

## Abstract

The AControlLayer (ACL) specifications define open standards for autonomous AI agent identity, data interchange, policy enforcement, and capability management. These specifications enable secure, auditable, and interoperable agent operations across heterogeneous platforms and frameworks.

This repository contains four core specifications:

-   **AIP-1** (Agent Identity Protocol): Cryptographic agent identification via short-lived X.509 certificates
-   **ADP-1** (Agent Data Protocol): Framework-agnostic format for recording agent work
-   **PVS-1** (Policy Verdict Schema): Structured policy enforcement decisions
-   **CTX-1** (Capability & Trust eXtensions): Standard capability string vocabulary

---

## Specification Overview

| Spec                      | Title                         | Category     | Status | Description                                                      |
| ------------------------- | ----------------------------- | ------------ | ------ | ---------------------------------------------------------------- |
| [AIP-1](specs/AIP-1.md)   | Agent Identity Protocol       | Identity     | RFC    | X.509 certificates with custom OIDs, blockchain-anchored root CA |
| [ADP-1](specs/ADP-1.md)   | Agent Data Protocol           | Data         | RFC    | Action-Observation-Reflection format for agent runs              |
| [PVS-1](specs/PVS-1.md)   | Policy Verdict Schema         | Policy       | RFC    | JSON structure for policy engine verdicts                        |
| [CTX-1](specs/CTX-1.md)   | Capability & Trust eXtensions | Capabilities | RFC    | Capability string naming conventions                             |
| [SPEC-0](specs/SPEC-0.md) | Specification Process         | Meta         | RFC    | Governance and document structure                                |

---

## Implementation Guide

### Platform Developer Checklist

| Step | Task                                         | Spec Reference      | Notes                              |
| ---- | -------------------------------------------- | ------------------- | ---------------------------------- |
| 1    | Generate Root CA and Intermediate CA         | AIP-1 Section 4.1   | RSA-4096 or ECDSA P-384            |
| 2    | Anchor Root CA fingerprint to blockchain     | AIP-1 Section 4.1   | Ethereum mainnet or Sepolia        |
| 3    | Implement certificate issuance with AIP OIDs | AIP-1 Section 3.1.2 | All 7 custom extensions            |
| 4    | Define capability vocabulary                 | CTX-1 Section 3-4   | Reserved prefixes                  |
| 5    | Implement certificate verification           | AIP-1 Section 4.2   | Chain, OIDs, environment, audience |
| 6    | Integrate policy engine                      | PVS-1 Section 3     | PVS-1 compliant verdicts           |
| 7    | Emit ADP-1 records                           | ADP-1 Section 3     | AIP fingerprint and verdicts       |

### Security Team Verification

```bash
# View certificate details and AIP extensions
openssl x509 -in agent.crt -text -noout

# Verify certificate chain
openssl verify -CAfile root-ca.crt -untrusted intermediate-ca.crt agent.crt

# Extract AIP OID values (Capability-Set)
AIP_CAPABILITIES_OID="$(node --input-type=module -e 'import contract from "./contracts/aip-1.json" with { type: "json" }; const extension = contract.extensions.find(({ constant }) => constant === "CAPABILITIES"); process.stdout.write(`${contract.oidBase}.${extension.suffix}`)')"
openssl x509 -in agent.crt -text -noout | grep -A1 "$AIP_CAPABILITIES_OID"

# Calculate Root CA fingerprint for blockchain verification
openssl x509 -in root-ca.crt -pubkey -noout | openssl sha256

# Verify certificate validity period
openssl x509 -in agent.crt -noout -dates
```

### Compliance Audit Points

| Audit Point            | Method                 | Expected Result        |
| ---------------------- | ---------------------- | ---------------------- |
| Certificate Lifetime   | `notBefore`/`notAfter` | ≤15 minutes            |
| Blockchain Anchor      | Query Ethereum         | Hash matches on-chain  |
| Capability Constraints | Parse `Capability-Set` | Authorized only        |
| Environment Isolation  | `AIP-Environment` OID  | Matches deployment     |
| Policy Verdicts        | ADP-1 audit trail      | All outputs have PVS-1 |
| Tenant Isolation       | `Tenant-ID` OID        | Correct tenant scope   |

---

## Trustless Verification

Identity roots are anchored on Ethereum for immutability.

| Network               | Status     | Root TX                                                              |
| :-------------------- | :--------- | :------------------------------------------------------------------- |
| **Sepolia (Testnet)** | 🟢 Active  | `0x9349d41f0c92d128cbc07e8d4697a92fa7d107b2468c1f2fc0e9a3bc6c74a33a` |
| **Mainnet**           | 🟡 Pending | _Scheduled for Q1 2026 Release_                                      |

## Roadmap

| Status | Quarter | Milestone                                         |
| :----: | :-----: | :------------------------------------------------ |
|   ✅   | Q4 2025 | Core specs published (AIP-1, ADP-1, PVS-1, CTX-1) |
|   ✅   | Q4 2025 | Interactive validators launched                   |
|   🟡   | Q1 2026 | Mainnet blockchain anchor                         |
|   🟡   | Q1 2026 | Reference implementation (ACL) open-sourced       |
|   ⚪   | Q2 2026 | Multi-language SDKs (Python, TypeScript, Go)      |

---

## Machine-Readable Resources

| Resource                       | Description                            |
| ------------------------------ | -------------------------------------- |
| [schemas/](schemas/)           | JSON Schema definitions (ADP-1, PVS-1)            |
| [types/](types/)               | Generated TypeScript types for all four contracts |
| [examples/](examples/)         | Sample payloads and certificates                  |
| [test-vectors/](test-vectors/) | Validation test cases                             |

The same canonical contracts are published in the
`@acontrollayer/spec-contracts` package. It exports the specification registry,
AIP-1 extension constants, CTX-1 grammar and reserved prefixes, and the ADP-1
and PVS-1 JSON Schemas. Its TypeScript declarations are generated from those
four machine contracts and exported from the `types` subpath:

```js
import aip from '@acontrollayer/spec-contracts/aip-1' with { type: 'json' };
import ctx from '@acontrollayer/spec-contracts/ctx-1' with { type: 'json' };
import pvsSchema from '@acontrollayer/spec-contracts/schemas/pvs-1' with { type: 'json' };
```

```ts
import type {
  Adp1AgentRun,
  Aip1Contract,
  Ctx1Contract,
  Pvs1PolicyVerdict,
} from '@acontrollayer/spec-contracts/types';
```

---

## Versioning

Specifications declare versions in schema identifiers (e.g., `version: "adp-1"`). Breaking changes increment the major version (e.g., `adp-2`). Releases are tagged as `aip-1.0`, `adp-1.0`, etc.

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

-   Reporting issues and requesting features
-   Submitting changes (errata, minor, major)
-   Style and formatting requirements
-   Review process and timelines

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

For security vulnerabilities, see [SECURITY.md](SECURITY.md).

---

## Adoption & Implementation

The reference implementation of these standards is available in the **AControlLayer** platform.

-   **For Enterprise:** [AgentComplianceLayer.com](https://acontrollayer.com) (Governance, Risk & Audit)
-   **For Developers:** [AgentOpsPlatform.com](https://acontrollayer.com) (Build, Debug & Trace)
-   **Reference Codebase:** [agentcontrollayer/acl](https://github.com/chrisbaber/acl) (Private Beta)

---

## License

Copyright 2025 AControlLayer, LLC. Released under the [MIT License](LICENSE).
