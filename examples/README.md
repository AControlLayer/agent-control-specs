# Examples

> **Withdrawn.** The drafts these files encode were withdrawn on August 8, 2026. They are kept for historical reference only, are not standards, and no product conforms to them. Do not use these files to validate anything. See [specs/README.md](../specs/README.md).

This directory contains example files demonstrating ACL specifications in practice.

## Directory Structure

```
examples/
├── README.md           # This file
├── certificates/       # AIP-1 certificate examples
│   └── README.md
├── adp/               # ADP-1 agent run examples
│   └── sample-run.json
└── pvs/               # PVS-1 policy verdict examples
    ├── sample-verdict-approved.json
    └── sample-verdict-rejected.json
```

## ADP Examples

### sample-run.json

A complete ADP-1 agent run demonstrating:

- Full agent identification with AIP linkage
- Multiple agent steps (tool calls, model inference)
- Embedded PVS-1 policy verdict
- Final output with metadata

## PVS Examples

### sample-verdict-approved.json

A PVS-1 verdict where content passed all policy checks.

### sample-verdict-rejected.json

A PVS-1 verdict where content was rejected due to PII policy violation.

## Validation

All examples are validated against their respective JSON schemas:

```bash
# From repository root
cd schemas
ajv validate -s adp-1.schema.json -d ../examples/adp/sample-run.json --spec=draft2020 -c ajv-formats
ajv validate -s pvs-1.schema.json -d ../examples/pvs/sample-verdict-approved.json --spec=draft2020 -c ajv-formats
```

## Using Examples

These examples serve as:

1. **Usage samples** - See how the schemas were meant to be used
2. **Test fixtures** - Use in your test suites
3. **Documentation** - Understand the specification through concrete examples

## Contributing

When adding examples:

1. Validate against the JSON schema
2. Use realistic, meaningful data
3. Include comments in a separate README if needed
4. Cover different use cases and scenarios
