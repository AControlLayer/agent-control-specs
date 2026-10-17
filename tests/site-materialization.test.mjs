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

test("site content materializer replaces every authored document with its withdrawal notice page", async (context) => {
  const { materializeSiteContent, renderWithdrawnPages, renderSidebarMeta } = await import(
    "../scripts/materialize-site-content.mjs"
  );
  const temporarySite = await mkdtemp(join(tmpdir(), "acl-spec-site-"));
  context.after(() => rm(temporarySite, { recursive: true, force: true }));
  await mkdir(join(temporarySite, "pages", "docs"), { recursive: true });
  await writeFile(join(temporarySite, "pages", "docs", "stale.md"), "# stale\n");

  await materializeSiteContent({ repositoryRoot, siteRoot: temporarySite });

  const docs = join(temporarySite, "pages", "docs");
  await assert.rejects(access(join(docs, "stale.md")));
  assert.equal((await lstat(docs)).isSymbolicLink(), true);
  const expected = await renderWithdrawnPages(join(repositoryRoot, "specs"), "specs");
  const authored = (await readdir(join(repositoryRoot, "specs"))).filter((name) => name.endsWith(".md"));
  assert.deepEqual(
    (await readdir(docs)).sort(),
    [...authored, "_meta.js"].sort(),
  );
  for (const { name, content } of expected) {
    assert.equal(await readFile(join(docs, name), "utf8"), content);
  }
  assert.equal(await readFile(join(docs, "_meta.js"), "utf8"), renderSidebarMeta(expected));
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

  await cp(join(repositoryRoot, "specs"), join(temporaryRoot, "specs"), { recursive: true });
  await mkdir(temporarySite, { recursive: true });
  await writeFile(join(temporarySite, ".gitignore"), renderSiteProjectionIgnoreRules());
  await mkdir(join(temporarySite, "pages"), { recursive: true });
  await cp(join(temporaryRoot, "specs"), join(temporarySite, "pages", "docs"), { recursive: true });
  await execFile("git", ["init", "-q"], { cwd: temporaryRoot });
  await execFile("git", ["add", "-f", "."], { cwd: temporaryRoot });

  await materializeSiteContent({ repositoryRoot: temporaryRoot, siteRoot: temporarySite });

  const { stdout: deleted } = await execFile(
    "git",
    ["diff", "--diff-filter=D", "--name-only", "--", "site/pages/docs"],
    { cwd: temporaryRoot },
  );
  assert.ok(deleted.includes("site/pages/docs/AIP-1.md"));
  for (const generatedPath of ["site/.generated", "site/pages/docs"]) {
    await execFile("git", ["check-ignore", "--no-index", generatedPath], { cwd: temporaryRoot });
  }
  await assert.rejects(
    execFile("git", ["check-ignore", "--no-index", "specs/AIP-1.md"], { cwd: temporaryRoot }),
  );
  await execFile("git", ["ls-files", "--error-unmatch", "specs/AIP-1.md"], { cwd: temporaryRoot });
});

test("generated site projections are not tracked as authored sources", async () => {
  const generatedPaths = ["site/pages/docs"];
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
