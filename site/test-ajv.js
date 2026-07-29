const assert = require('node:assert/strict');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '..');
const readJson = (...segments) =>
    JSON.parse(fs.readFileSync(path.join(repositoryRoot, ...segments), 'utf8'));
const adpSchema = readJson('schemas', 'adp-1.schema.json');
const pvsSchema = readJson('schemas', 'pvs-1.schema.json');

const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addKeyword('x-acontrollayer-policy');
addFormats(ajv);
const validateAdp = ajv.compile(adpSchema);
const validatePvs = ajv.compile(pvsSchema);

function assertValidation(validate, data, expected, label) {
    const actual = validate(data);
    assert.equal(
        actual,
        expected,
        `${label}: ${JSON.stringify(validate.errors)}`,
    );
}

assertValidation(
    validateAdp,
    readJson('examples', 'adp', 'sample-run.json'),
    true,
    'ADP-1 sample run',
);
for (const vector of readJson('test-vectors', 'adp-1-vectors.json').vectors) {
    assertValidation(validateAdp, vector.data, vector.valid, `ADP-1 vector ${vector.id}`);
}

for (const filename of ['sample-verdict-approved.json', 'sample-verdict-rejected.json']) {
    assertValidation(
        validatePvs,
        readJson('examples', 'pvs', filename),
        true,
        `PVS-1 example ${filename}`,
    );
}
for (const vector of readJson('test-vectors', 'pvs-1-vectors.json').vectors) {
    assertValidation(validatePvs, vector.data, vector.valid, `PVS-1 vector ${vector.id}`);
}

console.log('ADP-1 and PVS-1 schemas, examples, and test vectors are consistent.');
