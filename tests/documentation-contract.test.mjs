import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const repositoryRootPath = fileURLToPath(repositoryRoot);
const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, repositoryRoot), "utf8"));

test("normative AIP and CTX Markdown tables are fresh projections of machine contracts", async () => {
  const {
    extractContractSection,
    renderAipConformance,
    renderAipExtensionTable,
    renderAipLifetime,
    renderCtxGrammar,
    renderCtxReservedPrefixTable,
  } = await import("../scripts/check-contract-docs.mjs");
  const [aipContract, ctxContract, aipSpec, ctxSpec] = await Promise.all([
    readJson("contracts/aip-1.json"),
    readJson("contracts/ctx-1.json"),
    readFile(new URL("specs/AIP-1.md", repositoryRoot), "utf8"),
    readFile(new URL("specs/CTX-1.md", repositoryRoot), "utf8"),
  ]);

  assert.equal(
    extractContractSection(aipSpec, "aip-1-extensions"),
    renderAipExtensionTable(aipContract),
  );
  assert.equal(
    extractContractSection(ctxSpec, "ctx-1-reserved-prefixes"),
    renderCtxReservedPrefixTable(ctxContract),
  );
  assert.equal(
    extractContractSection(aipSpec, "aip-1-lifetime"),
    renderAipLifetime(aipContract),
  );
  assert.equal(
    extractContractSection(aipSpec, "aip-1-conformance"),
    renderAipConformance(aipContract),
  );
  assert.equal(
    extractContractSection(ctxSpec, "ctx-1-grammar"),
    renderCtxGrammar(ctxContract),
  );
});

test("generated projections reject duplicate or reversed marker pairs", async () => {
  const { extractContractSection } = await import(
    "../scripts/check-contract-docs.mjs"
  );
  const start = "<!-- spec-contract:test:start -->";
  const end = "<!-- spec-contract:test:end -->";

  assert.throws(
    () => extractContractSection(`${start}\nfirst\n${end}\n${start}\nsecond\n${end}`, "test"),
    /exactly one start marker and one end marker/,
  );
  assert.throws(
    () => extractContractSection(`${end}\ncontent\n${start}`, "test"),
    /correct order/,
  );
});

test("normative PVS prose is a fresh projection of its schema policy", async () => {
  const {
    extractContractSection,
    renderPvsConstraints,
    renderPvsDecisionRules,
    renderPvsEscalationTriggers,
    renderPvsRequiredFields,
    renderPvsSecurityThreshold,
    renderPvsTypescriptInterface,
    renderPvsConformance,
  } = await import("../scripts/check-contract-docs.mjs");
  const [schema, spec] = await Promise.all([
    readJson("schemas/pvs-1.schema.json"),
    readFile(new URL("specs/PVS-1.md", repositoryRoot), "utf8"),
  ]);

  assert.equal(extractContractSection(spec, "pvs-1-required-fields"), renderPvsRequiredFields(schema));
  assert.equal(extractContractSection(spec, "pvs-1-constraints"), renderPvsConstraints(schema));
  assert.equal(extractContractSection(spec, "pvs-1-decision-rules"), renderPvsDecisionRules(schema));
  assert.equal(extractContractSection(spec, "pvs-1-escalation-triggers"), renderPvsEscalationTriggers(schema));
  assert.equal(extractContractSection(spec, "pvs-1-security-threshold"), renderPvsSecurityThreshold(schema));
  assert.equal(extractContractSection(spec, "pvs-1-conformance"), renderPvsConformance(schema));
  const typescriptInterface = extractContractSection(spec, "pvs-1-typescript-interface");
  assert.equal(typescriptInterface, renderPvsTypescriptInterface(schema));
  assert.doesNotMatch(typescriptInterface, /:\s+integer[;\s]/);
});

test("documentation write path repairs every stale contract projection", async (context) => {
  const { checkContractDocs, writeContractDocs } = await import(
    "../scripts/check-contract-docs.mjs"
  );
  const temporaryRoot = await mkdtemp(join(tmpdir(), "acl-contract-docs-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await Promise.all([
    cp(join(repositoryRootPath, "contracts"), join(temporaryRoot, "contracts"), {
      recursive: true,
    }),
    cp(join(repositoryRootPath, "specs"), join(temporaryRoot, "specs"), {
      recursive: true,
    }),
    cp(join(repositoryRootPath, "schemas"), join(temporaryRoot, "schemas"), {
      recursive: true,
    }),
    cp(
      join(repositoryRootPath, "examples"),
      join(temporaryRoot, "examples"),
      { recursive: true },
    ),
  ]);
  const aipPath = join(temporaryRoot, "specs", "AIP-1.md");
  const aipSource = await readFile(aipPath, "utf8");
  await writeFile(
    aipPath,
    aipSource.replace(
      /<!-- spec-contract:aip-1-lifetime:start -->[\s\S]*?<!-- spec-contract:aip-1-lifetime:end -->/,
      "<!-- spec-contract:aip-1-lifetime:start -->\nstale\n<!-- spec-contract:aip-1-lifetime:end -->",
    ),
  );

  assert.ok((await checkContractDocs({ repositoryRoot: temporaryRoot })).length > 0);
  await writeContractDocs({ repositoryRoot: temporaryRoot });
  assert.deepEqual(await checkContractDocs({ repositoryRoot: temporaryRoot }), []);
});
