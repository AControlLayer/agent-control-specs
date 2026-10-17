[![Status: Withdrawn](https://img.shields.io/badge/Status-Withdrawn-red?style=for-the-badge)](specs/README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

# AControlLayer draft specifications — withdrawn

> **Every draft in this repository was withdrawn on August 8, 2026.** They are kept for historical reference only. None of them is a standard, no product conforms to them, and none of them should be implemented.

AControlLayer published these drafts in 2025 and 2026 for community feedback. A prior-art review found that established standards already cover each of their subjects more completely, so continuing them would have duplicated existing work. They also contain unresolved defects, at least one with security implications, and were withdrawn rather than corrected. No successor is planned.

Our current work aligns with the OWASP Agent Control Standard (ACS) draft rather than these specifications.

## The withdrawn drafts

| Draft | Title | Status | Already covered by |
| ----- | ----- | ------ | ------------------ |
| [SPEC-0](specs/SPEC-0.md) | Specification Process | Withdrawn | — governed only the drafts below |
| [AIP-1](specs/AIP-1.md) | Agent Identity Protocol | Withdrawn | [SPIFFE](https://spiffe.io/), IETF [WIMSE](https://datatracker.ietf.org/wg/wimse/about/) |
| [ADP-1](specs/ADP-1.md) | Agent Data Protocol | Withdrawn | [OpenTelemetry](https://opentelemetry.io/), [W3C Trace Context](https://www.w3.org/TR/trace-context/) |
| [PVS-1](specs/PVS-1.md) | Policy Verdict Schema | Withdrawn | [XACML 3.0](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html), [OpenID AuthZEN](https://openid.net/wg/authzen/) |
| [CTX-1](specs/CTX-1.md) | Capability & Trust eXtensions | Withdrawn | [SPKI (RFC 2693, 1999)](https://www.rfc-editor.org/rfc/rfc2693.html) |
| [PVS-2 RFC](rfcs/PVS-2-revise-outcome.md) | Structured `revise` outcome (proposed revision of PVS-1) | Withdrawn | — revised a withdrawn draft |

[specs/README.md](specs/README.md) is the withdrawal record.

## What is in this repository

- `specs/` and `rfcs/` — the historical text of each draft, each headed by its withdrawal notice.
- `contracts/`, `schemas/`, `types/`, `examples/`, `test-vectors/` — machine-readable files for the withdrawn drafts. They are withdrawn with them and should not be used to validate anything. The `@acontrollayer/spec-contracts` package they describe was never published to the npm registry.
- `site/` — the public site at specs.acontrollayer.com. It shows only withdrawal notices; it does not publish the drafts' text. The interactive validators and `/api/validate` endpoints it used to host have been removed.

Earlier versions of this README, including the material it removed, are in the git history.

## Contributing

These drafts are not being developed, so changes to them are not accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for what is still accepted, and [SECURITY.md](SECURITY.md) for reporting security issues.

## License

Copyright 2025 AControlLayer, LLC. Released under the [MIT License](LICENSE).
