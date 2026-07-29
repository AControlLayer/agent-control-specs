import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const importJson = async (specifier) =>
  (await import(specifier, { with: { type: "json" } })).default;
const repositoryRoot = new URL("../", import.meta.url);

test("registry names every public specification and its canonical machine export", async () => {
  const [registry, packageJson] = await Promise.all([
    importJson("@acontrollayer/spec-contracts/registry"),
    importJson("@acontrollayer/spec-contracts/package.json"),
  ]);

  assert.equal(registry.contractVersion, 1);
  assert.equal(
    new Set(registry.specifications.map(({ id }) => id)).size,
    registry.specifications.length,
  );
  for (const specification of registry.specifications) {
    await access(new URL(specification.narrativePath, repositoryRoot));
    assert.ok(specification.machineExport.startsWith(`${packageJson.name}/`));
    const exportName = `.${specification.machineExport.slice(packageJson.name.length)}`;
    assert.ok(packageJson.exports[exportName]);
  }
});

test("AIP-1 extensions, lifetime, and conformance form one internally consistent contract", async () => {
  const contract = await importJson("@acontrollayer/spec-contracts/aip-1");

  assert.equal(contract.id, "AIP-1");
  assert.ok(contract.certificateLifetime.recommendedMinutes > 0);
  assert.ok(
    contract.certificateLifetime.recommendedMinutes <=
      contract.certificateLifetime.maximumMinutes,
  );
  assert.ok(
    contract.certificateLifetime.maximumClockDriftSeconds <
      contract.certificateLifetime.verifierGraceSeconds,
  );

  const extensionConstants = new Set(
    contract.extensions.map(({ constant }) => constant),
  );
  assert.ok(contract.extensions.every(({ example }) => example.length > 0));
  assert.ok(
    contract.extensions.every(({ valueSchema }) => valueSchema?.description),
  );
  assert.equal(extensionConstants.size, contract.extensions.length);
  assert.ok(contract.extensions.every(({ oid }) => oid === undefined));
  assert.equal(
    new Set(contract.extensions.map(({ suffix }) => suffix)).size,
    contract.extensions.length,
  );
  contract.extensions.forEach(({ suffix }, index) => {
    assert.equal(suffix, index + 1);
    assert.match(`${contract.oidBase}.${suffix}`, /^(?:\d+\.)+\d+$/);
  });

  assert.deepEqual(
    contract.conformance.levels.map(({ level }) => level),
    contract.conformance.levels.map((_, index) => index + 1),
  );
  for (const level of contract.conformance.levels) {
    for (const constant of level.requiredExtensions) {
      assert.ok(extensionConstants.has(constant));
    }
    for (const { constant } of level.conditionalExtensions) {
      assert.ok(extensionConstants.has(constant));
    }
  }
  assert.equal(contract.conformance.levels[0].enforceMaximumLifetime, true);
  const byConstant = Object.fromEntries(
    contract.extensions.map((extension) => [extension.constant, extension]),
  );
  assert.equal(byConstant.VERSION.valueSchema.const, 1);
  assert.equal(byConstant.TENANT_ID.valueSchema.format, "uuid");
  assert.equal(byConstant.CAPABILITIES.valueSchema.type, "array");
  assert.equal(
    byConstant.CAPABILITIES.valueSchema.items.format,
    "ctx-1-capability",
  );
});

test("CTX-1 exports one lowercase grammar and the complete reserved prefix vocabulary", async () => {
  const contract = await importJson("@acontrollayer/spec-contracts/ctx-1");
  const separator = contract.grammar.separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const segmentCharacters = [
    contract.grammar.segmentCharacters.lowercaseAsciiLetters ? "a-z" : "",
    contract.grammar.segmentCharacters.digits ? "0-9" : "",
    ...contract.grammar.segmentCharacters.symbols.map((symbol) =>
      symbol.replace(/[\\\]\-^]/g, "\\$&"),
    ),
  ].join("");
  const segment = `(?:[${segmentCharacters}]+)`;
  const capabilityPattern = new RegExp(
    `^${segment}(?:${separator}${segment}){${contract.grammar.minimumSegments - 1},}$`,
  );

  assert.equal(contract.id, "CTX-1");
  assert.equal(contract.segmentPattern, undefined);
  assert.equal(contract.capabilityPattern, undefined);
  assert.ok(contract.grammar.recommendedMaximumLength > 0);
  assert.ok(contract.grammar.minimumSegments >= 2);
  assert.ok(contract.reservedPrefixes.length > 0);
  assert.ok(
    contract.reservedPrefixes.every(({ examples }) => examples.length > 0),
  );
  assert.equal(
    new Set(contract.reservedPrefixes.map(({ prefix }) => prefix)).size,
    contract.reservedPrefixes.length,
  );

  for (const { prefix, examples } of contract.reservedPrefixes) {
    assert.match(prefix, new RegExp(`^[${segmentCharacters}]+$`));
    for (const example of examples) {
      assert.match(example, capabilityPattern);
      assert.equal(example.split(contract.grammar.separator)[0], prefix);
    }
  }

  for (const invalidCapability of contract.invalidExamples) {
    assert.doesNotMatch(invalidCapability, capabilityPattern);
  }
});

test("ADP-1 and PVS-1 schemas are importable through package exports", async () => {
  const [adpSchema, pvsSchema] = await Promise.all([
    importJson("@acontrollayer/spec-contracts/schemas/adp-1"),
    importJson("@acontrollayer/spec-contracts/schemas/pvs-1"),
  ]);

  assert.equal(adpSchema.$id, "https://acontrollayer.com/schemas/adp-1.schema.json");
  assert.equal(pvsSchema.$id, "https://acontrollayer.com/schemas/pvs-1.schema.json");
  assert.equal(
    pvsSchema["x-acontrollayer-policy"].escalationConfidenceThreshold,
    0.9,
  );
  assert.ok(
    pvsSchema["x-acontrollayer-policy"].conformanceLevels.length >= 1,
  );
});
