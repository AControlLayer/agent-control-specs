# Agent Control Layer Specifications — withdrawn

**All specifications in this directory were withdrawn on 2026-08-05. None of them should be implemented.**

## Why

These specifications were published at RFC status, seeking community feedback. A prior-art review found that established standards already cover each of their domains more completely:

| Spec | Title | Status | Already specified by |
|------|-------|--------|----------------------|
| [SPEC-0](SPEC-0.md) | Specification Process | **Withdrawn** | — governed only the specifications below |
| [AIP-1](AIP-1.md) | Agent Identity Protocol | **Withdrawn** | [SPIFFE](https://spiffe.io/), IETF [WIMSE](https://datatracker.ietf.org/wg/wimse/about/) |
| [ADP-1](ADP-1.md) | Agent Data Protocol | **Withdrawn** | [OpenTelemetry](https://opentelemetry.io/), [W3C Trace Context](https://www.w3.org/TR/trace-context/) |
| [PVS-1](PVS-1.md) | Policy Verdict Schema | **Withdrawn** | [XACML 3.0](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html), [OpenID AuthZEN](https://openid.net/wg/authzen/) |
| [CTX-1](CTX-1.md) | Capability & Trust eXtensions | **Withdrawn** | [SPKI (RFC 2693, 1999)](https://www.rfc-editor.org/rfc/rfc2693.html) |

Continuing to develop these would have duplicated existing standards rather than added to them. They also contain unresolved defects, at least one with security implications, and are withdrawn rather than corrected — a corrected version would still be a duplicate.

## What replaced them

ACL profiles existing standards instead of defining new ones. There is no successor specification, and none is planned.

## Machine-readable artifacts

The JSON schemas under `/schemas`, the test vectors under `/test-vectors`, and the published contracts package are withdrawn along with the documents they encode. They should not be used to validate anything.

## Historical record

The documents are retained, unedited apart from their withdrawal notices, so that anyone who encountered them can see what became of them. Deleting them would leave inbound links resolving to nothing, which tells a reader less than a withdrawal notice does.
