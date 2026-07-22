import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("public AIP validator derives OIDs, required extensions, and lifetime from AIP-1 contract", async () => {
  const source = await readFile(
    new URL("site/lib/validators/aip.ts", repositoryRoot),
    "utf8",
  );

  assert.match(source, /import aipContract from ['"]\.\.\/\.\.\/\.\.\/contracts\/aip-1\.json['"]/);
  assert.match(source, /aipContract\.extensions/);
  assert.match(source, /aipContract\.certificateLifetime\.maximumMinutes/);
  assert.match(source, /aipContract\.conformance\.levels/);
  assert.match(source, /verifyCertificateSignatureChain/);
  assert.match(source, /await verifyCertificateSignatureChain/);
  assert.match(source, /validateAipExtensionValue/);
  assert.doesNotMatch(source, /\['VERSION', 'TENANT_ID', 'CAPABILITIES'\]/);
  assert.doesNotMatch(source, /1\.3\.6\.1\.4\.1\.59999/);
  assert.doesNotMatch(source, /extension\.oid/);
});

test("public CTX validator derives grammar and reserved prefixes from CTX-1 contract", async () => {
  const source = await readFile(
    new URL("site/lib/validators/ctx.ts", repositoryRoot),
    "utf8",
  );

  assert.match(source, /import ctxContract from ['"]\.\.\/\.\.\/\.\.\/contracts\/ctx-1\.json['"]/);
  assert.match(source, /from ['"]\.\/ctx-syntax\.mjs['"]/);
  assert.match(source, /isCtxCapability/);
  assert.match(source, /ctxContract\.grammar\.recommendedMaximumLength/);
  assert.match(source, /ctxContract\.reservedPrefixes/);
  assert.doesNotMatch(source, /ctxContract\.capabilityPattern/);
  assert.doesNotMatch(source, /indexOf\(['"]:['"]\)/);
  assert.doesNotMatch(source, /\^\(perm\|agent\|tenant\|sys\)/);
  assert.doesNotMatch(source, /new RegExp/);
});

test("interactive validator examples also derive normative values from contracts", async () => {
  const [aipComponent, ctxComponent] = await Promise.all([
    readFile(
      new URL("site/components/validators/AipValidator.tsx", repositoryRoot),
      "utf8",
    ),
    readFile(
      new URL("site/components/validators/CtxValidator.tsx", repositoryRoot),
      "utf8",
    ),
  ]);

  assert.match(aipComponent, /aipContract\.certificateLifetime\.recommendedMinutes/);
  assert.match(aipComponent, /aipContract\.certificateLifetime\.issuerBackdateMinutes/);
  assert.match(aipComponent, /aipContract\.conformance\.levels/);
  assert.match(aipComponent, /extension\.example/);
  assert.match(aipComponent, /issuerChain/);
  assert.match(aipComponent, /encodeAipExtensionValue/);
  assert.doesNotMatch(aipComponent, /Verify on Sepolia|Simulat(?:e|ing)/i);
  assert.doesNotMatch(aipComponent, /60 \* 15/);
  assert.doesNotMatch(aipComponent, /encode\(["']1\.0["']\)/);

  assert.match(ctxComponent, /ctxContract\.reservedPrefixes/);
  assert.doesNotMatch(ctxComponent, /useState\(['"]perm:files:read['"]\)/);
});
