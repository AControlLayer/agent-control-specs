import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import {
  access,
  cp,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execFile = promisify(execFileCallback);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

async function assertDirectoriesEqual(expectedDirectory, actualDirectory) {
  const expectedEntries = await readdir(expectedDirectory, { withFileTypes: true });
  const actualEntries = await readdir(actualDirectory, { withFileTypes: true });
  assert.deepEqual(
    actualEntries.map(({ name }) => name).sort(),
    expectedEntries.map(({ name }) => name).sort(),
  );

  for (const entry of expectedEntries) {
    const expectedPath = join(expectedDirectory, entry.name);
    const actualPath = join(actualDirectory, entry.name);
    if (entry.isDirectory()) {
      await assertDirectoriesEqual(expectedPath, actualPath);
    } else {
      assert.deepEqual(await readFile(actualPath), await readFile(expectedPath));
    }
  }
}

test("site content materializer creates exact projections from authored roots", async (context) => {
  const { materializeSiteContent } = await import("../scripts/materialize-site-content.mjs");
  const temporarySite = await mkdtemp(join(tmpdir(), "acl-spec-site-"));
  context.after(() => rm(temporarySite, { recursive: true, force: true }));
  await mkdir(join(temporarySite, "schemas"), { recursive: true });
  await writeFile(join(temporarySite, "schemas", "stale.json"), "{}\n");

  await materializeSiteContent({ repositoryRoot, siteRoot: temporarySite });

  await assert.rejects(access(join(temporarySite, "schemas", "stale.json")));
  await assertDirectoriesEqual(join(repositoryRoot, "specs"), join(temporarySite, "pages", "docs"));
  await assertDirectoriesEqual(join(repositoryRoot, "schemas"), join(temporarySite, "schemas"));
  await assertDirectoriesEqual(join(repositoryRoot, "examples"), join(temporarySite, "examples"));
  assert.equal((await lstat(join(temporarySite, "pages", "docs"))).isSymbolicLink(), true);
  assert.equal((await lstat(join(temporarySite, "schemas"))).isSymbolicLink(), true);
  assert.equal((await lstat(join(temporarySite, "examples"))).isSymbolicLink(), true);
});

test("projection registry derives exactly one ordered ignore-rule block", async () => {
  const { extractSiteProjectionIgnoreRules, renderSiteProjectionIgnoreRules } = await import(
    "../scripts/materialize-site-content.mjs"
  );
  const ignore = await readFile(join(repositoryRoot, "site", ".gitignore"), "utf8");
  assert.equal(extractSiteProjectionIgnoreRules(ignore), renderSiteProjectionIgnoreRules().trim());
  const block = renderSiteProjectionIgnoreRules();
  assert.throws(
    () => extractSiteProjectionIgnoreRules(`${ignore}\n${block}`),
    /exactly one start marker and one end marker/,
  );
  const start = "# spec-contract:generated-site-projections:start";
  const end = "# spec-contract:generated-site-projections:end";
  assert.throws(
    () => extractSiteProjectionIgnoreRules(`${end}\n${start}\n`),
    /correct order/,
  );
});

test("materialization cannot restore tracked projections and canonical sources remain tracked", async (context) => {
  const { materializeSiteContent, renderSiteProjectionIgnoreRules } = await import(
    "../scripts/materialize-site-content.mjs"
  );
  const temporaryRoot = await mkdtemp(join(tmpdir(), "acl-spec-git-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const temporarySite = join(temporaryRoot, "site");

  await Promise.all([
    cp(join(repositoryRoot, "specs"), join(temporaryRoot, "specs"), { recursive: true }),
    cp(join(repositoryRoot, "schemas"), join(temporaryRoot, "schemas"), { recursive: true }),
    cp(join(repositoryRoot, "examples"), join(temporaryRoot, "examples"), { recursive: true }),
  ]);
  await mkdir(temporarySite, { recursive: true });
  await writeFile(join(temporarySite, ".gitignore"), renderSiteProjectionIgnoreRules());
  await mkdir(join(temporarySite, "pages"), { recursive: true });
  await Promise.all([
    cp(join(temporaryRoot, "specs"), join(temporarySite, "pages", "docs"), { recursive: true }),
    cp(join(temporaryRoot, "schemas"), join(temporarySite, "schemas"), { recursive: true }),
    cp(join(temporaryRoot, "examples"), join(temporarySite, "examples"), { recursive: true }),
  ]);
  await execFile("git", ["init", "-q"], { cwd: temporaryRoot });
  await execFile("git", ["add", "-f", "."], { cwd: temporaryRoot });

  await materializeSiteContent({ repositoryRoot: temporaryRoot, siteRoot: temporarySite });

  const { stdout: deleted } = await execFile(
    "git",
    ["diff", "--diff-filter=D", "--name-only", "--", "site/pages/docs", "site/schemas", "site/examples"],
    { cwd: temporaryRoot },
  );
  assert.ok(deleted.includes("site/pages/docs/AIP-1.md"));
  assert.ok(deleted.includes("site/schemas/pvs-1.schema.json"));
  assert.ok(deleted.includes("site/examples/pvs/sample-verdict-approved.json"));
  for (const generatedPath of ["site/.generated", "site/pages/docs", "site/schemas", "site/examples"]) {
    await execFile("git", ["check-ignore", "--no-index", generatedPath], { cwd: temporaryRoot });
  }
  await assert.rejects(
    execFile("git", ["check-ignore", "--no-index", "specs/AIP-1.md"], { cwd: temporaryRoot }),
  );
  await execFile("git", ["ls-files", "--error-unmatch", "specs/AIP-1.md"], { cwd: temporaryRoot });
});

test("generated site projections are not tracked as authored sources", async () => {
  const generatedPaths = ["site/pages/docs", "site/schemas", "site/examples"];
  const { stdout: trackedOutput } = await execFile(
    "git",
    ["ls-files", ...generatedPaths],
    { cwd: repositoryRoot },
  );

  if (trackedOutput === "") {
    return;
  }

  const { stdout: deletedOutput } = await execFile(
    "git",
    ["diff", "--diff-filter=D", "--name-only", "--", ...generatedPaths],
    { cwd: repositoryRoot },
  );
  assert.deepEqual(
    deletedOutput.trim().split("\n").sort(),
    trackedOutput.trim().split("\n").sort(),
  );
});
