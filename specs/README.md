# Agent Control Layer Specifications — withdrawn

<!-- withdrawal-notice:start -->
> **Withdrawn.** Every draft in this directory was withdrawn on August 8, 2026. They are kept for historical reference and are not standards, and no product conforms to them. None of them should be implemented.

## Why

These drafts were published at RFC status, seeking community feedback. A prior-art review found that established standards already cover each of their subjects more completely:

| Draft | Title | Status | Already covered by |
|-------|-------|--------|--------------------|
| [SPEC-0](SPEC-0.md) | Specification Process | **Withdrawn** | — governed only the drafts below |
| [AIP-1](AIP-1.md) | Agent Identity Protocol | **Withdrawn** | [SPIFFE](https://spiffe.io/), IETF [WIMSE](https://datatracker.ietf.org/wg/wimse/about/) |
| [ADP-1](ADP-1.md) | Agent Data Protocol | **Withdrawn** | [OpenTelemetry](https://opentelemetry.io/), [W3C Trace Context](https://www.w3.org/TR/trace-context/) |
| [PVS-1](PVS-1.md) | Policy Verdict Schema | **Withdrawn** | [XACML 3.0](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html), [OpenID AuthZEN](https://openid.net/wg/authzen/) |
| [CTX-1](CTX-1.md) | Capability & Trust eXtensions | **Withdrawn** | [SPKI (RFC 2693, 1999)](https://www.rfc-editor.org/rfc/rfc2693.html) |

The proposed PVS-2 revision in `rfcs/` was withdrawn with them.

Continuing these drafts would have duplicated existing standards rather than added to them. They also contain unresolved defects, at least one with security implications, and are withdrawn rather than corrected — a corrected version would still be a duplicate.

## What replaced them

Nothing. There is no successor specification, and none is planned.

## Machine-readable artifacts

The JSON schemas, TypeScript types, examples and test vectors in this repository are withdrawn along with the drafts they encode. They should not be used to validate anything. The `@acontrollayer/spec-contracts` package they describe was never published to the npm registry.

## Historical record

The documents are retained so that anyone who encountered them can see what became of them. Deleting them would leave inbound links resolving to nothing, which tells a reader less than a withdrawal notice does. Apart from their withdrawal notices and status fields, they are unchanged, except that statements presenting a product as the model implementation of a draft, or as conforming to one, have been removed: no product conforms to a withdrawn draft. Earlier text remains in the repository's git history.
<!-- withdrawal-notice:end -->
