import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  exceedsCtxRecommendedLength,
  isCtxCapability,
} from "./lib/validators/ctx-syntax.mjs";

const ctxContract = JSON.parse(
  await readFile(new URL("../contracts/ctx-1.json", import.meta.url), "utf8"),
);

test("CTX syntax and recommended length are independent contract-derived policies", () => {
  const overlong = `vendor:${"a".repeat(ctxContract.grammar.recommendedMaximumLength)}`;
  assert.equal(isCtxCapability(overlong, ctxContract), true);
  assert.equal(exceedsCtxRecommendedLength(overlong, ctxContract), true);
});

test("CTX shared syntax compiler preserves unknown prefixes and rejects grammar violations", () => {
  assert.equal(isCtxCapability("vendor:custom-action", ctxContract), true);
  for (const invalid of ctxContract.invalidExamples) {
    assert.equal(isCtxCapability(invalid, ctxContract), false);
  }
});
