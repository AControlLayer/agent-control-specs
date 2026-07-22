import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("obsolete validator implementation guide is retired", async () => {
  await assert.rejects(access(new URL("Complete Validator Implementation Guide.md", repositoryRoot)));
  await assert.rejects(
    access(new URL("Complete Validator Implementation Guide.md:Zone.Identifier", repositoryRoot)),
  );
});

test("required CI check exercises contracts, site validation, build, and package dry run", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/spec-contracts.yml", repositoryRoot),
    "utf8",
  );

  assert.match(workflow, /name: Spec Contracts/);
  assert.match(workflow, /name: spec-contracts-required/);
  for (const command of [
    "npm run check",
    "npm ci --prefix site",
    "npm audit --prefix site --omit=dev --audit-level=high",
    "npm test --prefix site",
    "npm run build --prefix site",
    "npm pack --dry-run --json",
  ]) {
    assert.ok(workflow.includes(`run: ${command}`));
  }
});

test("operator ruleset activation is documented with the stable required check name", async () => {
  const contributing = await readFile(new URL("CONTRIBUTING.md", repositoryRoot), "utf8");

  assert.match(contributing, /spec-contracts-required/);
  assert.match(contributing, /ruleset/i);
  assert.match(contributing, /after (?:this change|the workflow) merges/i);
});
