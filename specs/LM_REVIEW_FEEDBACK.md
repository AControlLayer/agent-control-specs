# ACL Specs Review Feedback

**Status:** Draft / Review Complete
**Date:** 2025-12-10
**Reviewer:** Gemini (Agent Control Layer Team)

## Overall

The Agent Control Layer (ACL) specification suite (AIP-1, ADP-1, PVS-1, CTX-1) represents a mature and cohesive "defense-in-depth" approach to agent security and observability. The separation of concerns is excellent: **Identity** (AIP) is decoupled from **Execution Logging** (ADP), which is decoupled from **Policy Enforcement** (PVS), yet they interlock cleanly via the `Capability-Set` and standard formats.

The decision to leverage existing primitives (X.509, mTLS, JSON) rather than inventing new cryptographic protocols is a significant strength, ensuring compatibility with standard infrastructure (cloud LBs, existing PKI). The specs are largely "implementation-ready," and the reference code in `lib/` matches the stated goals well.

The primary areas for improvement revolve around **Operational Reality** (dealing with clock skew, LB TLS termination, and debugging distributed agents) and **Granularity** (adding structured data for policy violations and environment isolation).

---

## 1) AIP-1 – Agent Identity Protocol

### Strengths

-   **Standard Standards:** Using X.509 v3 + OIDs is robust and future-proof.
-   **Blast Radius Reduction:** Short-lived certificates (max 15m) effectively mitigate the "revoke problem" without complex CRL infrastructure.
-   **Reference Code:** `ca.ts` correctly implements the profile, including `Math.min` clamping on validity.

### Gaps / Risks

-   **Clock Skew:** A 5-minute validity window is tight. If a server's clock is 2 minutes behind, certificates might appear "not yet valid" or "expired" prematurely.
-   **TLS Termination:** In many production setups (AWS ALB, Cloudflare), mTLS is terminated at the edge, and the backend receives the cert in an HTTP header (e.g., `X-Client-Cert`). The spec implies direct mTLS which might not fit all topologies.
-   **Missing Context:** The current OIDs don't specify the _environment_ (Prod vs Staging). An agent with a valid cert might accidentally hit a Prod endpoint if network routing allows it.

### Concrete Recommendations

1.  **Add `Environment` Extension:**
    -   OID: allocate the next suffix under the canonical AIP OID base.
    -   Value: `production`, `staging`, `dev`.
    -   _Why:_ Prevents cross-environment accidents at the identity layer.
2.  **Mitigate Clock Skew:**
    -   Update `ca.ts` to backdate `notBefore` by 1-2 minutes (e.g., `now - 2m`) to account for verifying servers with lagging clocks.
3.  **Document LB Passthrough:**
    -   Explicitly mention in the spec that if mTLS is terminated at a load balancer, the _Validator_ logic must verify the `X-Client-Cert-Hash` or headers forwarded by the trusted LB.

---

## 2) ADP-1 – Agent Data Protocol

### Strengths

-   **Framework Agnostic:** The Action/Observation/Reflection loop fits almost every agent paradigm (LangChain tools, AutoGen functions, etc.).
-   **Immutability:** The reference to `audit-log-immutability.ts` and hash chaining is a standout feature for enterprise trust.

### Gaps / Risks

-   **Observability Silos:** There is no standard field for **Distributed Tracing**. If Agent A calls Agent B, there is no `trace_id` to link the two runs in specific logging tools (DataDog, Jaeger).
-   **Sub-steps:** Complex agents often have recursive structures (a step that spawns a sub-agent). The flat `steps` array doesn't capture hierarchy well.

### Concrete Recommendations

1.  **Add Trace Context:**
    -   Add `trace_id` and `span_id` to the top-level `metadata` or creating a dedicated `trace` block.
    -   Example:
        ```jsonc
        "trace": {
          "trace_id": "0af7651916cd43dd8448eb211c80319c",
          "span_id": "b7ad6b7169203331"
        }
        ```
2.  **Support Hierarchy:**
    -   Add optional `parent_step_id` to `AgentStep` to allow reconstructing trees from the flat list.
3.  **Standardize "Stop" Reasons:**
    -   Status `failed` is broad. Add `cancellation_reason` or a `failure_code` enum (e.g., `rate_limited`, `policy_violation`, `timeout`) to the top-level run object.

---

## 3) PVS-1 – Policy Verdict Schema

### Strengths

-   **Clean Interface:** The `approved` boolean makes enforcement trivial.
-   **Auditability:** `reasoning` and `confidence_score` provide the "why," which is crucial for compliance.

### Gaps / Risks

-   **Unstructured Violations:** `policy_violations` is an array of strings. It's hard for a UI highlight _which_ part of the text caused the violation, or how severe it is (INFO vs CRITICAL).
-   **Missing Remediation:** The agent doesn't know _how_ to fix the checking error. "No PII" is vague; "Redact the SSN" is actionable.

### Concrete Recommendations

1.  **Structured Violations:**
    -   Deprecate string array (or keep for backward compat) and add `violations` object array:
        ```jsonc
        "violations": [
          {
            "policy_name": "No PII",
            "severity": "critical", // critical, warning, info
            "location": { "start": 10, "end": 20 }, // Optional char range
            "remediation_hint": "Mask the detected SSN with ***"
          }
        ]
        ```
2.  **Versioning:**
    -   Ensure `version: "pvs-1"` is actually emitted by `The Sentry` (currently missing in code).

---

## 4) CTX-1 – Capability & Trust Context

### Strengths

-   **Simple & Readable:** `namespace:name` is intuitive and debuggable.
-   **RBAC Mapping:** The `perm:resource:action` pattern maps 1:1 with standard RBAC tables, making adoption easy.

### Gaps / Risks

-   **Foot-gun: Static Permissions:** If an admin revokes a permission in the DB, an agent with a valid 15-minute cert _still has access_ until it expires. This "async revocation" needs distinct warning labels.
-   **Missing "Limit" capabilities:** `budget:` is defined, but rate limits (`quota:`) are missing.

### Concrete Recommendations

1.  **Add `quota` namespace:**
    -   `quota:daily_requests:1000` or `quota:concurrency:5`.
2.  **Document the "Revocation Lag":**
    -   Add a "Security Considerations" section explicitly stating that CTX-1 capabilities are **valid for the lifetime of the cert** and cannot be instantly revoked without blocking the cert fingerprint itself.

---

## Cross-Cutting / Big Picture

### Coherence

The specs align very well. The progression of **Identity (AIP) -> Permission (CAP) -> Work (ADP) -> Review (PVS)** mimics a human organization's workflow.

### High-Leverage Additions (Pre-Launch)

1.  **`Environment` in AIP:** Prevents catastrophic cross-env errors. (Low effort, High impact).
2.  **`Trace ID` in ADP:** Essential for debugging multi-agent systems. (Low effort, High value).
3.  **Backdate Certs in AIP:** Fixes the clock skew operational headache before it starts. (One line of code).

### Explicit Deferrals (Post-Launch)

1.  **Signed ADP Streams:** While cool for "tamper-proof logs," `audit-log-immutability.ts` (hash chaining) covers 80% of the value for 10% of the cost. Do not implement per-step crypto signatures for v1.
2.  **Complex CAP Logic:** Don't try to encode "Access file X if owned by Y" into capabilities. Keep CAP static and simple; handle complex authZ in the application logic (ABAC) or PVS.
