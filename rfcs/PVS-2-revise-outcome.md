---
title: "RFC: Add a structured revise outcome in PVS-2"
author: AControlLayer (ACL) Team <specs@acontrollayer.com>
status: Proposed
type: Major Change Proposal
category: Policy
created: 2026-07-22
updated: 2026-07-22
affects: PVS-1
proposed_successor: PVS-2
---

# RFC: Add a Structured `revise` Outcome in PVS-2

## Status of This Proposal

This document requests the major-change process defined by
[CONTRIBUTING.md](../CONTRIBUTING.md) and [SPEC-0](../specs/SPEC-0.md). It does
not modify PVS-1. Acceptance requires a minimum 30-day public comment period,
editor approval, community consensus, and publication as a new major version.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when,
and only when, they appear in all capitals.

## Abstract

PVS-1 defines `allow`, `deny`, and `escalate`. Implementations also encounter a
distinct outcome: the evaluated proposal is not acceptable as written, but a
policy evaluator can return machine-readable constraints under which an
authorized actor may construct a new proposal for evaluation.

This RFC proposes a fourth outcome, `revise`, for PVS-2. A revise verdict blocks
the evaluated proposal, binds the verdict to that proposal and its policy
context, carries structured revision constraints, and requires a separately
identified proposal to pass the complete policy evaluation again. A revise
verdict never grants authority to execute or to mutate privileged context.

PVS-2 also removes PVS-1's derived `approved` field. `decision` becomes the one
wire-level authority for disposition; compatibility projections belong in
explicit adapters rather than in a second, potentially contradictory field.

## 1. Prerequisite: Repair the PVS-1 Executable Contract

The public PVS-1 prose added a required `decision` field in v1.1.0, but the
published JSON Schema, examples, and test vectors did not add it. The schema
therefore accepted records with no decision, contradictory records such as
`decision: "deny"` with `approved: true`, and unknown decisions such as
`decision: "revise"` while claiming PVS-1.

That split-brain contract MUST be repaired before this RFC's public comment
period begins. The prerequisite change makes the public package the executable
source of truth and enforces all of the following across schema, examples,
vectors, validators, and documentation checks:

- `decision` is required for PVS-1;
- its exact vocabulary is `allow | deny | escalate`;
- the legacy `approved` projection is consistent with `decision`;
- contradictory, missing, and unknown decisions fail validation; and
- authored contracts mechanically validate every projection and consumer.

This is a correction to the already-documented PVS-1 wire contract, not a way
to introduce `revise` into PVS-1. PVS-2 remains a separately reviewed major
change.

## 2. Problem Statement

The PVS-1 decisions distinguish these states:

- `allow`: the evaluated proposal may execute within the evaluated scope;
- `deny`: the evaluated proposal must stop; and
- `escalate`: the evaluated proposal must stop pending another decision path.

They do not represent: "this proposal must stop, and an authorized actor may
construct a new proposal that satisfies these machine-readable constraints."
Mapping that state to `deny` loses interoperable revision constraints. Mapping
it to `escalate` conflates proposal construction with transfer to another
decision path. Silently extending PVS-1 breaks consumers that correctly reject
unknown decisions.

## 3. Proposed Disposition Model

PVS-2 would define these decisions:

| Decision | Evaluated proposal may execute | Required next step |
|---|---:|---|
| `allow` | Yes | Execute only within the bound proposal and policy context |
| `deny` | No | Stop |
| `escalate` | No | Follow a separately authorized escalation policy |
| `revise` | No | An authorized actor may construct a new proposal satisfying the revision constraints |

`decision` is the sole disposition authority. PVS-2 MUST NOT contain an
`approved` field. Consumers determine executability using the exact predicate
`decision === "allow"` after validating the full verdict.

For `decision: "revise"`:

1. The evaluated proposal MUST NOT execute.
2. The verdict MUST include a structured `revision_request`.
3. The verdict MUST be authenticated and integrity-protected, and that signed
   verdict MUST bind to the evaluated proposal and policy context.
4. A revised proposal MUST have a distinct identity and content digest.
5. The revised proposal MUST traverse the complete authentication,
   authorization, capability, approval, and policy-evaluation path.
6. Revision instructions MUST NOT be interpreted as authorization.
7. A revision chain MUST be bounded and auditable. Exhaustion MUST fail closed
   as defined in Section 7.

## 4. Minimum Wire Shape

The exact PVS-2 schema would be authored after this RFC is accepted. The
following shape illustrates the proposed minimum contract:

```json
{
  "version": "pvs-2",
  "verdict_id": "verdict:01J...",
  "issuer": "policy-engine:the-sentry",
  "issued_at": "2026-07-22T18:00:00Z",
  "expires_at": "2026-07-22T18:05:00Z",
  "decision": "revise",
  "evaluated_proposal": {
    "proposal_id": "proposal:01J...",
    "digest_algorithm": "sha-256",
    "canonicalization": "jcs-rfc8785",
    "digest": "sha256:4db..."
  },
  "policy_context": {
    "policy_set_id": "policy-set:outbound-email-v4",
    "digest_algorithm": "sha-256",
    "canonicalization": "jcs-rfc8785",
    "digest": "sha256:8a1..."
  },
  "reasoning": "The recipient is outside the approved domain set.",
  "policy_violations": ["recipient-domain-policy"],
  "confidence_score": 0.96,
  "revision_request": {
    "revision_profile_id": "revision-profile:outbound-email-v2",
    "revision_profile_digest": "sha256:19c...",
    "requirements": [
      {
        "path": "/action/input/to",
        "predicate": "domain_suffix_one_of",
        "values": ["example.com"]
      }
    ],
    "guidance": "Select a recipient already authorized by the workflow."
  },
  "revision_chain": {
    "chain_id": "sha256:6f2...",
    "root_proposal_digest": "sha256:4db...",
    "ordinal": 0,
    "maximum_revisions": 2,
    "prior_verdict_id": null
  },
  "chain_commit": {
    "registry_id": "revision-registry:primary",
    "sequence": 0,
    "consumed_predecessor": null,
    "receipt": "base64url:eyJ..."
  },
  "integrity": {
    "profile": "pvs-2-signature-1",
    "algorithm": "Ed25519",
    "key_id": "did:web:policy.example#pvs-signing-2026-07",
    "canonicalization": "jcs-rfc8785",
    "signature": "base64url:MEU..."
  }
}
```

`guidance` is OPTIONAL, untrusted, human-readable data. It MUST NOT be executed,
used as a patch, or treated as a source of authority. Interoperable automated
revision derives only from schema-valid `requirements` and a trusted revision
profile resolved independently of the verdict.

## 5. Proposal and Policy Binding

Every PVS-2 verdict, not only `revise`, MUST bind to the exact proposal it
evaluated. For JSON proposals, the initial specification SHOULD standardize
SHA-256 over the JSON Canonicalization Scheme defined by RFC 8785. Supporting a
different proposal encoding requires a versioned canonicalization identifier
with deterministic test vectors.

The verdict MUST also bind to the evaluated policy context. A policy context
includes the policy set and any security-relevant configuration that can change
the result. Implementations MUST NOT accept a verdict when either digest fails
to match the proposal or policy context presented at enforcement time.

`proposal_id` is an operational identifier; `digest` is the content identity.
Neither substitutes for the other. `verdict_id` and the bound digests form the
immutable links used by the audit chain.

### 5.1 Verdict Authenticity and Integrity

Content digests alone do not authenticate a verdict: an attacker could replace
both an object and its digest. Every PVS-2 verdict MUST carry a verifiable
digital signature from an issuer authorized by the bound policy context.

The initial signature profile uses Ed25519. Its signed bytes are the RFC 8785
canonical encoding of the complete verdict with only the
`integrity.signature` member omitted. The `issuer`, `key_id`, signature
profile, algorithm, canonicalization identifier, proposal binding, policy
binding, revision request, and chain state are therefore all signed.

Consumers MUST resolve `key_id` through a trusted issuer registry, verify that
the key was authorized for PVS verdicts, enforce key revocation policy, and
verify the signature before acting on `decision`. Live enforcement MUST reject
a key that is revoked at validation time or whose compromise-effective time
has passed, regardless of the signer-controlled `issued_at` value.
Transport authentication MAY provide defense in depth but does not replace the
portable verdict signature. Missing, unknown, forged, or invalid signatures
MUST fail closed.

`issued_at` and `expires_at` are signed RFC 3339 UTC timestamps. The normative
PVS-2 contract MUST define an absolute maximum lifetime; this RFC proposes five
minutes and a maximum accepted clock skew of 30 seconds. A bound policy MAY
require a shorter lifetime or smaller skew but MUST NOT extend either standard
maximum. Consumers MUST reject expired, excessively long-lived, or future-
dated verdicts. A claimed issuance time does not prove when a signature was
created and MUST NOT override current revocation or compromise status.
Replaying a verdict outside its validity window MUST fail closed.

Historical audit validation MAY preserve a verdict that predates later key
revocation only when an independently trusted timestamp, transparency-log
entry, or authenticated registry receipt proves that the already-signed
verdict existed before the revocation or compromise-effective time. The signer
cannot provide that proof. Historical validity never permits an expired verdict
to authorize live execution.

## 6. Structured Revision Constraints

PVS-2 MUST define one field-path grammar. This RFC recommends JSON Pointer
[RFC6901] because it is deterministic and already standardized.

The normative schema MUST define a closed predicate vocabulary with field-type
rules and size bounds. At minimum, it should cover equality, membership,
numeric bounds, string-pattern constraints, presence, absence, and a bounded
set of common typed predicates. Unknown predicates MUST fail validation.

A `required_fields` list is insufficient: it cannot distinguish an absent
field from a present but unsafe value. Free-text guidance is also insufficient
for machine interoperability. A constructor claims compliance only when the new
proposal satisfies every structured requirement and the trusted revision
profile permits every referenced path.

## 7. Revision Authority, Immutable Context, and Exhaustion

The trusted revision profile defines the permitted constructor principal
classes and the minimum authority required to construct a successor proposal.
Those requirements MUST NOT be selected or weakened by the verdict. Before
constructing a new proposal, the consumer MUST authenticate the actor and
verify the profile-defined authority under the bound policy context.

Revision profiles are authored policy artifacts, identified and digested in
the verdict but resolved from a trusted source. The normative profile contract
MUST define authenticated issuer/key identity and canonical signed bytes.
Consumers MUST verify the profile signature and issuer authorization before
comparing its canonical digest to `revision_profile_digest`. The requested
paths MUST be a subset of the profile's mutable paths, and any constructor
metadata in a verdict or successor proposal MUST satisfy the profile's actor
and authority bounds. A verdict cannot expand either set.

Regardless of profile contents, a revision request MUST NOT modify system-
derived or privileged context, including principal identity, tenant identity,
credentials, capabilities, policy selection, approval evidence, audit lineage,
executor identity, or the security classification of the tool or target. A
proposal format that embeds such context MUST define its protected paths.

The trusted revision profile defines `maximum_revisions`; the verdict merely
echoes that value. `chain_id` is deterministically derived as:

```text
SHA-256(
  UTF8("PVS-2-REVISION-CHAIN\0") ||
  RFC8785({
    root_proposal_id,
    root_proposal_digest,
    policy_context_digest,
    revision_profile_digest
  })
)
```

Including both root identity and content identity prevents distinct proposal
instances with identical JSON from sharing a chain. The normative contract
MUST include exact byte and digest test vectors.

For every successor verdict, `chain_id`, `root_proposal_digest`, and
`maximum_revisions` MUST exactly match the chain root; `prior_verdict_id` MUST
identify the immediately preceding verified verdict; and `ordinal` MUST equal
the preceding ordinal plus one. The successor proposal MUST carry or be
presented with that verified lineage. Missing, reset, forked, or increment-
skipping lineage MUST fail closed.

Packet-local validation cannot prevent two otherwise valid successors from
claiming the same predecessor. Each revision profile MUST name an authoritative
revision-chain registry. Before a successor verdict becomes valid, that
registry MUST atomically compare-and-set the chain head from
`prior_verdict_id` to the successor `verdict_id` and issue an authenticated
`chain_commit` receipt covering the registry, chain, sequence, predecessor,
successor, and commit time. A consumer MUST verify the receipt against the
trusted registry and require its sequence to equal the prior sequence plus one.
The registry MUST reject second consumption of a predecessor. If the registry
or receipt cannot be verified, `revise` fails closed. PVS-2 revision chains are
linear; protocol-level branching is out of scope for the initial version.

A `revise` verdict is invalid when its ordinal is already at the trusted
maximum. On exhaustion, the deterministic default is `deny`. An implementation
MAY emit `escalate` only when the bound policy context explicitly authorizes an
escalation path; exhaustion itself does not create that authority.

## 8. State-Machine Requirements

The permitted transition is:

```text
proposal N -> evaluate -> revise -> authorized construction of proposal N+1 -> evaluate
```

The following transitions are forbidden:

```text
proposal N -> revise -> execute proposal N
proposal N -> revise -> patch proposal N in place
proposal N -> revise -> execute proposal N+1 without full evaluation
```

A malformed verdict MUST be treated as invalid policy evidence and MUST fail
closed. Unknown decisions MUST NOT be reinterpreted as `allow`. A PVS-1
consumer MUST reject a PVS-2 verdict unless it explicitly supports PVS-2; there
is no silent down-conversion rule.

## 9. Security and Privacy Considerations

### 9.1 Authority Confusion

Revision constraints and guidance are policy output, not authorization. They
MUST NOT bypass authentication, authorization, capability, approval, or tool-
policy checks.

### 9.2 Untrusted Guidance

Human-readable reasoning and guidance can contain prompt injection or unsafe
content. Consumers MUST preserve provenance, apply normal untrusted-content
controls, and MUST NOT execute those strings.

### 9.3 Proposal Substitution

The proposal and policy digests MUST be verified at the enforcement point. A
verdict for one proposal or policy context MUST NOT authorize another.

### 9.4 Verdict Forgery and Tampering

Consumers MUST verify issuer authorization and the mandatory verdict signature
before reading a disposition. Replacing a decision, digest, revision profile,
chain limit, or any other signed field invalidates the verdict.

### 9.5 Confused-Deputy Revision

Only an independently authenticated and authorized constructor may produce the
new proposal. Privileged context remains immutable even when a revision request
claims otherwise.

### 9.6 Resource Exhaustion

The profile-bound chain limit and exact-link invariants prevent a producer from
resetting or increasing the limit across revise/re-evaluate cycles. Bound
exhaustion is deny by default and never becomes an implicit allow.

### 9.7 Fork and Replay Resistance

The authoritative registry linearizes each chain with atomic predecessor
consumption. Consumers MUST reject a competing successor, a reused receipt, a
sequence gap, an untrusted registry, or a verdict outside its signed validity
window.

### 9.8 Audit Integrity and Data Minimization

Implementations MUST retain tamper-evident identities, digests, chain links,
decisions, and policy evidence for the retention period required by their
applicable policy. Raw proposal content MAY remain in a separate access-
controlled evidence store referenced by digest when retaining it in the
verdict would violate privacy or minimization requirements. Implementations
MUST apply access control and deletion policy without breaking the surviving
chain's integrity evidence.

## 10. Compatibility and Migration

PVS-1 remains exactly `allow | deny | escalate` and retains `approved` only as
its legacy derived projection.

A PVS-1-to-PVS-2 adapter MUST first validate that PVS-1 `decision`, `approved`,
and `policy_violations` are consistent. It MUST reject contradictory records.
It may then omit `approved` and add the PVS-2 binding fields from trusted
evaluation context; it MUST NOT fabricate binding evidence from the verdict.

A PVS-2-to-PVS-1 adapter MUST reject `revise`; there is no semantics-preserving
down-conversion. For the other decisions it MAY derive PVS-1 `approved` as
`decision === "allow"` only after full PVS-2 validation.

An implementation that supports revision before PVS-2 is accepted MUST label
that record as implementation-specific rather than claiming PVS-1 conformance.

## 11. Alternatives Considered

### 11.1 Encode Revise as `deny`

This is safe for execution but loses the interoperable distinction between a
terminal rejection and a constrained re-proposal path.

### 11.2 Encode Revise as `escalate`

This preserves blocking behavior but conflates proposal construction with a
separately authorized escalation path.

### 11.3 Attach a Free-Text Hint to `deny`

Free text is untrusted and non-interoperable. It cannot safely define automated
changes, authority, protected fields, or loop behavior.

### 11.4 Add `revise` to PVS-1

This would silently broaden an existing public enum and break consumers that
correctly reject unknown values. SPEC-0 requires a new major version.

### 11.5 Retain `approved` in PVS-2

This would preserve a duplicate disposition field and recreate the
contradiction already observed in PVS-1's historical schema drift. PVS-2 uses
one canonical decision and derives any convenience boolean in local code only.

## 12. Review Questions

1. Is `revise` semantically distinct enough from `deny` and `escalate` to
   justify a standard outcome?
2. Is JSON Pointer plus a closed predicate vocabulary sufficient for initial
   interoperable revision constraints?
3. Which proposal encodings, canonicalization identifiers, and digest
   algorithms belong in the first PVS-2 release?
4. Should the mandatory revision-profile contract be an inline PVS-2 schema or
   a companion specification published in the same release?
5. Are the mandatory privileged-context categories complete enough for
   proposal formats with different field layouts?
6. What implementation evidence is required before PVS-2 advances from RFC to
   Candidate?

## 13. Acceptance Criteria

Before publication as PVS-2, the proposal MUST have:

- the PVS-1 executable-contract repair merged and published;
- resolution of the review questions above;
- one normative PVS-2 document and machine-readable schema, with every prose,
  example, vector, validator, and site projection mechanically checked against
  that contract;
- a simultaneously published normative revision-profile contract defining its
  schema, authenticated issuer/key trust, canonical signed bytes, canonical
  digest, mutable paths, constructor classes and minimum authorities, maximum
  revisions, and authoritative chain registry;
- positive and negative test vectors covering contradictory dispositions,
  forged and tampered verdicts, unauthorized signing keys, stale and future-
  dated verdicts, keys revoked at validation, post-revocation backdated
  signatures, historical claims without independent timestamp evidence,
  proposal substitution, policy-context and revision-profile substitution or
  downgrade, unauthorized revision, privileged-field mutation, unknown
  predicates, chain reset or limit inflation, identical-content root
  identities, competing successors, predecessor replay, malformed chain links,
  and loop-bound exhaustion;
- explicit PVS-1 adapter and rejection tests;
- at least two independent implementation reports for RFC-to-Candidate
  progression as required by SPEC-0;
- completed public comment and editor review requirements; and
- a CHANGELOG entry for the accepted version.

## 14. References

- [PVS-1](../specs/PVS-1.md)
- [SPEC-0](../specs/SPEC-0.md)
- [Contribution and major-change process](../CONTRIBUTING.md)
- [RFC2119](https://www.rfc-editor.org/rfc/rfc2119)
- [RFC8174](https://www.rfc-editor.org/rfc/rfc8174)
- [RFC6901](https://www.rfc-editor.org/rfc/rfc6901)
- [RFC8785](https://www.rfc-editor.org/rfc/rfc8785)

---

_Copyright 2026 AControlLayer. Released under the MIT License._
