# Contributing to the AControlLayer draft specifications

Every draft specification in this repository (SPEC-0, AIP-1, ADP-1, PVS-1, CTX-1 and the proposed PVS-2 revision) was withdrawn on August 8, 2026. They are kept for historical reference only, and they are not being developed. The change process these drafts used to follow (SPEC-0 and the errata, minor and major change tracks) was withdrawn with them.

## What is accepted

- **Corrections to withdrawal notices** — a notice that is unclear, inaccurate, or missing.
- **Fixes to the public site** (`site/`) — broken links, rendering problems, or anything that presents a withdrawn draft as a live standard.
- **Repository maintenance** — dependency updates and fixes that keep the required check green.

## What is not accepted

- Changes to the substance of a withdrawn draft, its schemas, contracts, examples or test vectors.
- New specifications or RFCs.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to specs@acontrollayer.com.

## Reporting issues

[Open an issue](https://github.com/AControlLayer/agent-control-specs/issues/new) for a problem with a withdrawal notice or with the site. For security issues, follow [SECURITY.md](SECURITY.md) instead.

## Submitting changes

1. Create a branch from `main`.
2. Make the change and update `CHANGELOG.md`.
3. Run the local equivalent of the required check:

   ```bash
   npm run check
   npm ci --prefix site
   npm audit --prefix site --omit=dev --audit-level=high
   npm test --prefix site
   npm run build --prefix site
   npm pack --dry-run --json
   ```

4. Open a pull request against `main`.

Some sections of the withdrawn drafts are generated from the files in `contracts/` and are delimited by `spec-contract:*` comments; do not hand-edit them. Each document's withdrawal notice is delimited by `withdrawal-notice:*` comments, and the public site is generated from those notices: `npm run build --prefix site` turns every document in `specs/` into a notice page at the same URL, and fails if a document is not marked withdrawn.

## Required check

The `spec-contracts-required` GitHub Actions check validates the package,
contract-backed documentation, withdrawal notices, schemas, examples, test
vectors, public site build, and publishable package contents. Repository
operators MUST add this check to the `main` branch ruleset
after the workflow merges; a workflow name alone does not make a check required.

## Questions?

- **Email**: specs@acontrollayer.com
- **Issues**: [GitHub Issues](https://github.com/AControlLayer/agent-control-specs/issues)
