import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, repositoryRoot), "utf8"));

test("PVS-1 schema decision enum exactly matches the normative public prose", async () => {
  const [schema, prose] = await Promise.all([
    readJson("schemas/pvs-1.schema.json"),
    readFile(new URL("specs/PVS-1.md", repositoryRoot), "utf8"),
  ]);
  const proseDecisionValues = [
    ...prose.matchAll(/^- `([a-z]+)`$/gm),
  ].map((match) => match[1]);

  assert.deepEqual(schema.properties.decision.enum, ["allow", "deny", "escalate"]);
  assert.deepEqual(proseDecisionValues, schema.properties.decision.enum);
  assert.ok(schema.required.includes("decision"));
  assert.ok(!schema.properties.decision.enum.includes("revise"));
});

test("PVS-1 examples carry decisions consistent with their approved projection", async () => {
  const schema = await readJson("schemas/pvs-1.schema.json");
  const examples = await Promise.all([
    ...schema.examples,
    await readJson("examples/pvs/sample-verdict-approved.json"),
    await readJson("examples/pvs/sample-verdict-rejected.json"),
  ]);

  for (const example of examples) {
    assert.ok(schema.properties.decision.enum.includes(example.decision));
    assert.equal(example.approved, example.decision === "allow");
    if (example.decision === "allow") {
      assert.deepEqual(example.policy_violations, []);
    }
  }
});

test("PVS-1 vectors exercise every decision and reject the retired revise value", async () => {
  const { vectors } = await readJson("test-vectors/pvs-1-vectors.json");
  const validDecisions = new Set(
    vectors.filter(({ valid }) => valid).map(({ data }) => data.decision),
  );
  const reviseVector = vectors.find(({ id }) => id === "pvs-invalid-revise-decision");

  assert.deepEqual(validDecisions, new Set(["allow", "deny", "escalate"]));
  assert.equal(reviseVector.valid, false);
  assert.equal(reviseVector.data.decision, "revise");
});

test("PVS-1 verdicts embedded in ADP examples use the canonical decision vocabulary", async () => {
  const [sampleRun, adpProse] = await Promise.all([
    readJson("examples/adp/sample-run.json"),
    readFile(new URL("specs/ADP-1.md", repositoryRoot), "utf8"),
  ]);
  const embeddedVerdict = sampleRun.steps
    .map(({ observation }) => observation?.output)
    .find(({ version } = {}) => version === "pvs-1");

  assert.equal(embeddedVerdict.decision, "allow");
  assert.match(
    adpProse,
    /"version": "pvs-1",\n\s+"decision": "deny",\n\s+"approved": false/,
  );
});
