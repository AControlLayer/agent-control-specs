# JSON Schemas

> **Withdrawn.** The drafts these files encode were withdrawn on August 8, 2026. They are kept for historical reference only, are not standards, and no product conforms to them. Do not use these files to validate anything. See [specs/README.md](../specs/README.md).

This directory contains machine-readable JSON Schema definitions for ACL specifications.

## Schemas

| File | Specification | Description |
|------|---------------|-------------|
| `adp-1.schema.json` | ADP-1 | Agent Data Protocol run and step schemas |
| `pvs-1.schema.json` | PVS-1 | Policy Verdict Schema |

## Usage

### Validation with Node.js (ajv)

```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const schema = require('./adp-1.schema.json');
const validate = ajv.compile(schema);

const data = require('../examples/adp/sample-run.json');
const valid = validate(data);

if (!valid) {
  console.error(validate.errors);
}
```

### Validation with Python (jsonschema)

```python
import json
from jsonschema import validate, ValidationError

with open('adp-1.schema.json') as f:
    schema = json.load(f)

with open('../examples/adp/sample-run.json') as f:
    data = json.load(f)

try:
    validate(instance=data, schema=schema)
    print("Valid!")
except ValidationError as e:
    print(f"Invalid: {e.message}")
```

### Validation with CLI (ajv-cli)

```bash
# Install
npm install -g ajv-cli ajv-formats

# Validate
ajv validate -s adp-1.schema.json -d ../examples/adp/sample-run.json --spec=draft2020 -c ajv-formats
```

## Schema Version

These schemas follow [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-core).

## Contributing

When modifying schemas:

1. Ensure backward compatibility for minor changes
2. Update the corresponding test vectors
3. Validate all examples against the updated schema
4. Update the specification document if needed
