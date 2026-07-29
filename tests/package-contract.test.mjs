import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("root package exposes the public machine contracts without lifecycle scripts", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", repositoryRoot), "utf8"),
  );

  assert.equal(packageJson.name, "@acontrollayer/spec-contracts");
  assert.equal(packageJson.type, "module");
  assert.deepEqual(packageJson.files, ["contracts", "schemas", "types", "examples"]);

  for (const lifecycleScript of [
    "preinstall",
    "install",
    "postinstall",
    "prepare",
    "prepack",
    "postpack",
    "prepublish",
    "prepublishOnly",
  ]) {
    assert.equal(packageJson.scripts?.[lifecycleScript], undefined);
  }

  assert.deepEqual(Object.keys(packageJson.exports).sort(), [
    ".",
    "./aip-1",
    "./ctx-1",
    "./package.json",
    "./registry",
    "./schemas/adp-1",
    "./schemas/pvs-1",
    "./types",
  ]);

  assert.deepEqual(packageJson.exports["./types"], {
    types: "./types/index.d.ts",
  });
});
