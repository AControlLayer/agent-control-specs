import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { schemaType } from "../scripts/generate-types.mjs";

const repositoryRoot = new URL("../", import.meta.url);

test("generated TypeScript contract types are fresh", () => {
  const result = spawnSync(process.execPath, ["scripts/generate-types.mjs", "--check"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

test("generated unions derive from all four public machine contracts", async () => {
  const [types, aip, ctx, adp, pvs] = await Promise.all([
    readFile(new URL("types/index.d.ts", repositoryRoot), "utf8"),
    readFile(new URL("contracts/aip-1.json", repositoryRoot), "utf8").then(JSON.parse),
    readFile(new URL("contracts/ctx-1.json", repositoryRoot), "utf8").then(JSON.parse),
    readFile(new URL("schemas/adp-1.schema.json", repositoryRoot), "utf8").then(JSON.parse),
    readFile(new URL("schemas/pvs-1.schema.json", repositoryRoot), "utf8").then(JSON.parse),
  ]);

  for (const { constant } of aip.extensions) assert.match(types, new RegExp(`\\b${constant}\\b`));
  for (const { prefix } of ctx.reservedPrefixes) assert.match(types, new RegExp(`"${prefix}"`));
  for (const value of adp.$defs.AgentStep.properties.action.properties.type.enum) {
    assert.match(types, new RegExp(`"${value}"`));
  }
  for (const value of pvs.properties.decision.enum) assert.match(types, new RegExp(`"${value}"`));

  assert.match(types, /export interface Adp1AgentRun/);
  assert.match(types, /export interface Pvs1PolicyVerdict/);
  assert.match(types, /export interface Aip1Contract/);
  assert.match(types, /export interface Ctx1Contract/);

});

test("nested object types preserve the schema's additional-properties boundary", () => {
  const fixture = {
    type: "object",
    properties: { value: { type: "string" } },
    required: ["value"],
  };

  assert.match(schemaType(fixture), /\[key: string\]/);
  assert.doesNotMatch(schemaType({ ...fixture, additionalProperties: false }), /\[key: string\]/);
});
