import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  encodeAipDerValue,
  encodeAipExtensionValue,
  validateAipExtensionValue,
} from "./lib/validators/aip-extension-values.mjs";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [aipContract, ctxContract] = await Promise.all([
  readJson("../contracts/aip-1.json"),
  readJson("../contracts/ctx-1.json"),
]);
const extensions = Object.fromEntries(
  aipContract.extensions.map((extension) => [extension.constant, extension]),
);

for (const extension of aipContract.extensions) {
  test(`${extension.constant} contract example is DER encoded and semantically valid`, () => {
    const encoded = encodeAipExtensionValue(extension, extension.example, ctxContract);
    assert.doesNotThrow(() => validateAipExtensionValue(extension, encoded, ctxContract));
  });
}

test("raw UTF-8 bytes are rejected instead of being mistaken for DER", () => {
  assert.throws(
    () => validateAipExtensionValue(
      extensions.TENANT_ID,
      new TextEncoder().encode(extensions.TENANT_ID.example),
      ctxContract,
    ),
    /DER/,
  );
});

test("AIP-Version rejects a correctly encoded integer other than contract version 1", () => {
  const encoded = encodeAipDerValue("INTEGER", "999");
  assert.throws(
    () => validateAipExtensionValue(extensions.VERSION, encoded, ctxContract),
    /semantic value/i,
  );
});

test("Tenant-ID rejects a correctly encoded non-UUID string", () => {
  const encoded = encodeAipDerValue("UTF8String", "tenant-123");
  assert.throws(
    () => validateAipExtensionValue(extensions.TENANT_ID, encoded, ctxContract),
    /semantic value/i,
  );
});

test("Tenant-ID rejects UUID URNs and uppercase UUID text", () => {
  for (const invalid of [
    `urn:uuid:${extensions.TENANT_ID.example}`,
    "AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE",
  ]) {
    assert.throws(
      () => validateAipExtensionValue(
        extensions.TENANT_ID,
        encodeAipDerValue("UTF8String", invalid),
        ctxContract,
      ),
      /semantic value/i,
    );
  }
});

test("Capability-Set rejects non-JSON and non-CTX capability arrays", () => {
  assert.throws(
    () => validateAipExtensionValue(
      extensions.CAPABILITIES,
      encodeAipDerValue("IA5String", "not-json"),
      ctxContract,
    ),
    /JSON array/i,
  );
  assert.throws(
    () => validateAipExtensionValue(
      extensions.CAPABILITIES,
      encodeAipDerValue("IA5String", '["INVALID"]'),
      ctxContract,
    ),
    /semantic value/i,
  );
});

test("Capability-Set accepts CTX grammar with an unknown prefix", () => {
  const value = '["vendor:custom-action"]';
  const encoded = encodeAipExtensionValue(extensions.CAPABILITIES, value, ctxContract);
  assert.deepEqual(
    validateAipExtensionValue(extensions.CAPABILITIES, encoded, ctxContract),
    ["vendor:custom-action"],
  );
});

test("wrong DER tag and non-ASCII IA5String are rejected", () => {
  assert.throws(
    () => validateAipExtensionValue(
      extensions.TENANT_ID,
      encodeAipDerValue("IA5String", extensions.TENANT_ID.example),
      ctxContract,
    ),
    /tag/,
  );
  assert.throws(() => encodeAipDerValue("IA5String", "ténant"), /ASCII/);
});
