# Contributing to Agent Control Layer Specifications

Thank you for your interest in contributing to the Agent Control Layer (ACL) specifications. This document provides guidelines for contributing to this project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Specification Change Process](#specification-change-process)
4. [Style Guidelines](#style-guidelines)
5. [Review Process](#review-process)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to specs@acontrollayer.com.

---

## How to Contribute

### Reporting Issues

- **Bug Reports**: If you find an error, inconsistency, or ambiguity in a specification, [open an issue](https://github.com/chrisbaber/agent-control-specs/issues/new) with the label `bug`.
- **Feature Requests**: For new capabilities or extensions, open an issue with the label `enhancement`.
- **Questions**: For clarifications or implementation questions, use the label `question`.

### Issue Template

When opening an issue, please include:

```markdown
**Specification**: [AIP-1 | ADP-1 | PVS-1 | CTX-1]
**Section**: [e.g., "2.1.2 Custom AIP Extensions"]
**Type**: [Bug | Enhancement | Question | Clarification]

**Description**:
[Clear description of the issue or proposal]

**Proposed Change** (if applicable):
[Your suggested resolution]

**Rationale**:
[Why this change improves the specification]
```

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main` with a descriptive name:
   - `fix/aip-1-oid-typo`
   - `feature/adp-1-batch-steps`
   - `docs/clarify-capability-format`
3. **Make your changes** following the [Style Guidelines](#style-guidelines)
4. **Test** any JSON schema changes against the test vectors
5. **Submit a Pull Request** with a clear description

Normative AIP-1 and CTX-1 constants are authored once in `contracts/`. Do not
hand-edit sections delimited by `spec-contract:*` comments. After changing a
machine contract, regenerate those projections and run the local CI equivalent:

```bash
npm run write:contract-docs
npm run check
npm ci --prefix site
npm test --prefix site
npm run build --prefix site
npm pack --dry-run --json
```

---

## Specification Change Process

Changes to specifications follow a structured process based on their impact:

### Errata (Typos, Clarifications)

- Minor corrections that do not change meaning
- Can be merged with single maintainer approval
- Documented in CHANGELOG under "Fixed"

### Minor Changes (Non-Breaking)

- New optional fields
- Additional examples
- Extended guidance
- Requires review period of 7 days
- Documented in CHANGELOG under "Added" or "Changed"

### Major Changes (Breaking)

- Changes to required fields
- Semantic changes to existing behavior
- New major version of a specification
- Requires:
  - RFC-style proposal document
  - 30-day public comment period
  - Approval from specification editors
- Results in new specification version (e.g., AIP-2)

### Process Diagram

```
Issue Opened
     │
     ▼
┌─────────────┐
│   Triage    │
└─────────────┘
     │
     ├─── Errata ──────► Quick Fix ──► Merge
     │
     ├─── Minor ───────► PR + 7-day Review ──► Merge
     │
     └─── Major ───────► RFC Proposal
                              │
                              ▼
                        30-day Comment
                              │
                              ▼
                        Editor Review
                              │
                              ▼
                        New Spec Version
```

---

## Style Guidelines

### Document Structure

All specifications MUST follow the structure defined in [SPEC-0](specs/SPEC-0.md):

1. YAML Frontmatter
2. Status of This Memo
3. Abstract
4. Table of Contents (for documents > 3 sections)
5. Terminology
6. Specification body (numbered sections)
7. Security Considerations
8. Conformance Requirements
9. References
10. Acknowledgments
11. Copyright Notice

### Language

- Use [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) normative keywords:
  - **MUST**, **MUST NOT** — Absolute requirements
  - **SHOULD**, **SHOULD NOT** — Recommended but not required
  - **MAY** — Optional
- Write in clear, precise technical English
- Avoid colloquialisms and jargon
- Define all terms in the Terminology section

### Formatting

- Use GitHub-Flavored Markdown
- Code blocks MUST specify language (e.g., ```json, ```bash)
- Tables MUST have header rows
- JSON examples SHOULD use `jsonc` for comments
- Line length SHOULD NOT exceed 100 characters in prose

### JSON Schema

- Follow [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-core)
- Include `$schema`, `$id`, `title`, and `description` in all schemas
- Provide `examples` for all non-trivial types

### Examples

- All examples MUST be valid according to their schema
- Examples SHOULD demonstrate realistic use cases
- Include both minimal and comprehensive examples

---

## Review Process

### Pull Request Requirements

- [ ] Follows style guidelines
- [ ] Updates CHANGELOG.md
- [ ] Updates `updated` date in frontmatter
- [ ] Passes schema validation (if applicable)
- [ ] Includes test vectors for new features
- [ ] Has clear commit messages

The `spec-contracts-required` GitHub Actions check validates the package,
contract-backed documentation, schemas, examples, test vectors, public site
build, and publishable package contents. Repository operators MUST add this
check to the `main` branch ruleset after the workflow merges; a workflow name
alone does not make a check required.

### Review Timeline

| Change Type | Minimum Review Period | Required Approvals |
|-------------|----------------------|-------------------|
| Errata | None | 1 maintainer |
| Minor | 7 days | 2 maintainers |
| Major | 30 days | All editors + community consensus |

### Maintainers

Current specification maintainers:

- Agent Control Layer Team (specs@acontrollayer.com)

---

## Recognition

Contributors who make significant contributions will be acknowledged in:

- The Acknowledgments section of affected specifications
- The project's contributor list
- Release notes

---

## Questions?

- **Email**: specs@acontrollayer.com
- **Issues**: [GitHub Issues](https://github.com/chrisbaber/agent-control-specs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chrisbaber/agent-control-specs/discussions)

Thank you for helping improve the Agent Control Layer specifications!
