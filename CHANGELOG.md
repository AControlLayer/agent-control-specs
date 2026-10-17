# Changelog

All notable changes to the Agent Control Layer specifications will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- Interactive validators and the `/api/validate/adp`, `/api/validate/aip`,
  `/api/validate/ctx` and `/api/validate/pvs` endpoints from the public site.
  They validated data against withdrawn drafts, so a passing result meant
  nothing. `/validator` now explains that they were removed.
- The drafts' text from the public site. Every page under `/docs/` now shows
  only the document's withdrawal notice and a link to the historical text in
  this repository; the URLs are unchanged.
- "Reference implementation" sections and conformance-claim statements from
  AIP-1, ADP-1 and SPEC-0. They described a product as conforming to a draft;
  no product conforms to a withdrawn draft.
- The README's historical material: the blockchain-anchor status table and
  transaction, the validator quickstart, the implementation guide, the audit
  checklist, the roadmap and the "reference implementation" section.
- The site's validator-only dependencies (`@peculiar/*`); `ajv` and
  `ajv-formats` are now development dependencies used only by tests.

### Changed

- Every withdrawal notice now states: "This draft was withdrawn on August 8,
  2026. It is kept for historical reference and is not a standard, and no
  product conforms to it." The recorded withdrawal date is August 8, 2026, the
  date the withdrawal merged (#5); earlier notices said August 5.
- The proposed PVS-2 RFC is withdrawn (status `Proposed` → `Withdrawn`).
- The site build now fails if any document in `specs/` or `rfcs/` is not marked
  withdrawn on that date.
- SECURITY.md and CONTRIBUTING.md describe the withdrawn status: no draft
  version is supported, and changes to the drafts are not accepted.

### Security

- Cleared the high and critical production advisories that `npm audit` reports
  against the site's lockfile: `next` 15.5.21 → 15.5.28, `sharp` 0.35.3 →
  0.35.5, `@xmldom/xmldom` 0.9.10 → 0.9.12 (patch bumps, via overrides where a
  parent pins the version), plus `npm audit fix` for transitive packages.

---

## Withdrawn - 2026-08-08

### Withdrawn

- AIP-1, ADP-1, PVS-1, CTX-1 and SPEC-0 (#5). Established standards already
  cover each of their subjects more completely, and the drafts contain
  unresolved defects. They were withdrawn rather than corrected, and no
  successor is planned. See [specs/README.md](specs/README.md).

### Added (merged in July 2026, never released)

- Proposed PVS-2 RFC for a fail-closed, proposal-bound `revise` outcome with a
  single disposition authority, structured revision constraints, immutable
  privileged context, independently verified revision authority, and bounded
  audit chains
- `@acontrollayer/spec-contracts` package with canonical registry,
  AIP-1, CTX-1, ADP-1, and PVS-1 machine exports
- Deterministically generated TypeScript types for all four machine contracts,
  exported from `@acontrollayer/spec-contracts/types`
- Contract-backed freshness checks for normative AIP-1 and CTX-1 tables
- Deterministic documentation write path and required CI check covering package,
  site, schema, example, vector, build, and package-content validation

### Fixed (merged in July 2026, never released)

- PVS-1 JSON Schema and examples now enforce the documented required
  `allow | deny | escalate` decision vocabulary and its `approved` projection
- Public validators now derive AIP-1 and CTX-1 values from the machine contracts
  instead of maintaining independent copies
- Retired the obsolete validator implementation guide and tracked site build
  projections that could drift from their authored sources

---

## [1.2.0] - 2026-03-20

### Changed

#### Cross-Cutting: Policy Engine Rename
- **Renamed "The Gavel" to "The Sentry"** across all specs, schemas, examples, and test vectors to match the name used in ACL's code (`the-sentry.ts`)
- Updated `metadata.engine` values from `"the-gavel"` to `"the-sentry"` in PVS-1 spec, schema, examples, and test vectors
- Updated PVS-1 Section 3 heading from "The Gavel Integration" to "The Sentry Integration"
- Updated ADP-1 references and sample payloads
- Updated README architecture diagram
- Updated LM review documents

**Migration Guide:**
- Consumers checking `metadata.engine === "the-gavel"` should update to `"the-sentry"`
- The PVS-1 schema does not constrain the `engine` value, so existing records remain valid

---

## [1.1.1] - 2026-03-20

### Added
- JSON Schema definitions for ADP-1 and PVS-1
- Example certificates, payloads, and test vectors
- SPEC-0 meta-specification defining specification governance
- Security Considerations sections in all specifications
- RFC 2119 normative language compliance
- Conformance requirements for each specification

### Changed
- Standardized frontmatter across all specifications to IETF RFC/EIP style
- Updated documentation to gold-standard professional presentation

---

## [1.1.0] - 2025-12-23

### Changed

#### PVS-1: Policy Verdict Schema v1.1.0
- **BREAKING**: Added required `decision` field with values `"allow"`, `"deny"`, or `"escalate"`
- The `approved` field is now derived from `decision` for backwards compatibility
- Added Section 3.1: Escalation Handling with implementation guidelines
- Added recommendation that low confidence (< 0.7) SHOULD result in `decision: "escalate"`
- Updated examples to include `decision` field
- Added escalation priority to Future Work section

**Migration Guide:**
- Existing consumers should update to check `decision` field
- For backwards compatibility, `approved: true` maps to `decision: "allow"`
- For backwards compatibility, `approved: false` with violations maps to `decision: "deny"`
- New `decision: "escalate"` indicates human review is required

**Rationale:**
The boolean `approved` field was insufficient for cases where the policy engine is uncertain.
The new `decision` field allows explicit escalation to human reviewers, improving safety in
high-stakes scenarios where the engine lacks confidence in its verdict.

---

## [1.0.0] - 2025-12-14

### Added

#### AIP-1: Agent Identity Protocol
- Initial release of Agent Identity Protocol specification
- X.509 certificate profile with custom AIP OID extensions (1.3.6.1.4.1.59999.1.x)
- Short-lived certificate model (5-15 minute validity)
- Blockchain anchoring for Root CA verification (Ethereum Sepolia)
- Trust architecture: The Verification Triangle
- Environment and Audience validation requirements
- Marketplace interoperability framework

#### ADP-1: Agent Data Protocol
- Initial release of Agent Data Protocol specification
- Agent Run schema for end-to-end execution records
- Agent Step schema (Action → Observation → Reflection)
- AIP-1 integration via `agent.aip` block
- Framework-agnostic design supporting LangChain, CrewAI, AutoGen, etc.
- Policy verdict embedding support

#### PVS-1: Policy Verdict Schema
- Initial release of Policy Verdict Schema specification
- Standard JSON structure for policy enforcement decisions
- The Gavel integration mapping
- ADP-1 embedding format

#### CTX-1: Capability & Trust eXtensions
- Initial release of Capability & Trust eXtensions specification
- Capability string naming conventions
- Reserved prefixes: `agent:`, `tenant:`, `service_account:`, `perm:`, `budget:`
- RBAC to capability mapping guidelines

#### Infrastructure
- _Entry removed on withdrawal. It listed a test-network transaction for the
  draft's trust anchor; no anchor is operated and none is planned._

---

## Version History by Specification

| Specification | Last Version | Initial Release | Status |
|---------------|--------------|-----------------|--------|
| SPEC-0 | 1.0.0 | 2025-12-14 | Withdrawn 2026-08-08 |
| AIP-1 | 1.0.0 | 2025-12-09 | Withdrawn 2026-08-08 |
| ADP-1 | 1.0.0 | 2025-12-10 | Withdrawn 2026-08-08 |
| PVS-1 | 1.2.0 | 2025-12-10 | Withdrawn 2026-08-08 |
| CTX-1 | 1.0.0 | 2025-12-10 | Withdrawn 2026-08-08 |
| PVS-2 (RFC) | — | never released | Withdrawn 2026-08-08 |

No further releases are planned.

---

[Unreleased]: https://github.com/chrisbaber/agent-control-specs/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/chrisbaber/agent-control-specs/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/chrisbaber/agent-control-specs/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/chrisbaber/agent-control-specs/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/chrisbaber/agent-control-specs/releases/tag/v1.0.0
