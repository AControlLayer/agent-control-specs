# Test Vectors

> **Withdrawn.** The drafts these files encode were withdrawn on August 8, 2026. They are kept for historical reference only, are not standards, and no product conforms to them. Do not use these files to validate anything. See [specs/README.md](../specs/README.md).

This directory contains test vectors for validating implementations of ACL specifications.

## Files

| File | Specification | Description |
|------|---------------|-------------|
| `adp-1-vectors.json` | ADP-1 | Agent Data Protocol validation test cases |
| `pvs-1-vectors.json` | PVS-1 | Policy Verdict Schema validation test cases |

## Test Vector Format

Each test vector file contains:

```json
{
  "$schema": "schema-url",
  "description": "Description of test suite",
  "vectors": [
    {
      "id": "unique-test-id",
      "description": "What this test validates",
      "valid": true,
      "data": { ... }
    }
  ]
}
```

## Using Test Vectors

### Running Validation Tests

```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const vectors = require('./pvs-1-vectors.json');
const schema = require('../schemas/pvs-1.schema.json');

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

let passed = 0;
let failed = 0;

for (const vector of vectors.vectors) {
  const result = validate(vector.data);
  const expected = vector.valid;
  
  if (result === expected) {
    passed++;
    console.log(`PASS: ${vector.id}`);
  } else {
    failed++;
    console.log(`FAIL: ${vector.id} - expected ${expected}, got ${result}`);
    if (!result) console.log(validate.errors);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
```

## Conformance Testing

_This section was removed when the drafts were withdrawn. It described how implementations could claim conformance; no implementation can conform to a withdrawn draft._

## Contributing

When adding test vectors:

1. Include both positive (valid) and negative (invalid) cases
2. Cover edge cases and boundary conditions
3. Provide clear descriptions for each vector
4. Ensure vectors align with the specification text
