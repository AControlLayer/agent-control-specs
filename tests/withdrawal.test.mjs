import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  WITHDRAWAL_DATE,
  WITHDRAWAL_STATEMENT,
  assertWithdrawn,
  parseFrontmatter,
  renderWithdrawnPages,
} from "../scripts/materialize-site-content.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const markdownIn = async (directory) =>
  (await readdir(join(repositoryRoot, directory)))
    .filter((name) => name.endsWith(".md"))
    .map((name) => `${directory}/${name}`);

// Statements that would present a withdrawn draft as a live standard, or claim
// properties no product has. None may appear on the public site or in the
// repository's front-door documents.
const LIVE_STANDARD_CLAIMS = [
  /sepolia/i,
  /ethereum/i,
  /on-chain/i,
  /blockchain/i,
  /\b0x[0-9a-f]{64}\b/i,
  /reference implementation/i,
  /\bconforms to (?:AIP|ADP|PVS|CTX|SPEC)-\d/i,
  /\blevel [123]\b/i,
  /\b(?:compliant|certified)\b/i,
  /\bSOC ?2\b|\bHIPAA\b|\bISO 27001\b/i,
  /specs\.acontrollayer\.com\/validator/i,
  /\]\(\/validator\)/,
];

const assertNoLiveStandardClaims = (label, text) => {
  for (const pattern of LIVE_STANDARD_CLAIMS) {
    assert.doesNotMatch(text, pattern, `${label} matches ${pattern}`);
  }
};

test("every draft and RFC is withdrawn on the same date and says so", async () => {
  const documents = [...(await markdownIn("specs")), ...(await markdownIn("rfcs"))];
  assert.ok(documents.length > 0);
  for (const path of documents) {
    const source = await readFile(join(repositoryRoot, path), "utf8");
    const frontmatter = parseFrontmatter(source);
    const notice = assertWithdrawn(source, path);
    if (frontmatter.status !== undefined) {
      assert.equal(frontmatter.status, "Withdrawn", path);
      assert.equal(frontmatter.withdrawn, WITHDRAWAL_DATE, path);
    }
    if (frontmatter.spec !== undefined || path.startsWith("rfcs/")) {
      assert.ok(notice.includes(WITHDRAWAL_STATEMENT), `${path} lacks the withdrawal statement`);
    }
    assert.match(notice, /withdrawn on August 8, 2026/, path);
  }
});

test("the withdrawal gate rejects a draft that is not marked withdrawn", () => {
  const notice = `<!-- withdrawal-notice:start -->\n> ${WITHDRAWAL_STATEMENT}\n<!-- withdrawal-notice:end -->`;
  const draft = (status, withdrawn, body = notice) =>
    `---\nspec: X-1\nstatus: ${status}\nwithdrawn: ${withdrawn}\n---\n\n# X-1\n\n${body}\n`;

  assert.doesNotThrow(() => assertWithdrawn(draft("Withdrawn", WITHDRAWAL_DATE)));
  assert.throws(() => assertWithdrawn(draft("Proposed", WITHDRAWAL_DATE)), /not "Withdrawn"/);
  assert.throws(() => assertWithdrawn(draft("Withdrawn", "2026-08-05")), /withdrawn date/);
  assert.throws(() => assertWithdrawn(draft("Withdrawn", WITHDRAWAL_DATE, "text")), /exactly one/);
  assert.throws(
    () =>
      assertWithdrawn(
        draft(
          "Withdrawn",
          WITHDRAWAL_DATE,
          "<!-- withdrawal-notice:start -->\nobsolete\n<!-- withdrawal-notice:end -->",
        ),
      ),
    /does not carry the withdrawal statement/,
  );
});

test("public site pages carry withdrawal notices and no live-standard claims", async () => {
  const pages = await renderWithdrawnPages(join(repositoryRoot, "specs"), "specs");
  for (const { name, content } of pages) {
    assert.match(content, /withdrawn on August 8, 2026/, name);
    assertNoLiveStandardClaims(`generated page ${name}`, content);
  }
  const aip = pages.find(({ name }) => name === "AIP-1.md").content;
  assert.ok(aip.includes(WITHDRAWAL_STATEMENT));
  assert.doesNotMatch(aip, /Conformance|Capability-Set|Anchor/);

  const authoredSitePages = (await readdir(join(repositoryRoot, "site", "pages")))
    .filter((name) => /\.(?:mdx?|jsx?|tsx?)$/.test(name))
    .map((name) => join("site", "pages", name));
  for (const path of [...authoredSitePages, "site/theme.config.jsx"]) {
    assertNoLiveStandardClaims(path, await readFile(join(repositoryRoot, path), "utf8"));
  }
});

test("front-door documents make no live-standard claims", async () => {
  for (const path of ["README.md", "SECURITY.md", "CONTRIBUTING.md"]) {
    assertNoLiveStandardClaims(path, await readFile(join(repositoryRoot, path), "utf8"));
  }
});

test("interactive validators and their API endpoints are removed and unlinked", async () => {
  for (const path of ["site/pages/api", "site/components/validators", "site/lib/validators"]) {
    await assert.rejects(access(join(repositoryRoot, path)), `${path} still exists`);
  }
  const navigation = await readFile(join(repositoryRoot, "site", "pages", "_meta.js"), "utf8");
  assert.match(navigation, /validator:\s*\{\s*display:\s*['"]hidden['"]\s*\}/);
  for (const path of ["README.md", "site/pages/index.mdx"]) {
    const text = await readFile(join(repositoryRoot, path), "utf8");
    assert.doesNotMatch(text, /\]\([^)]*\/api\/validate/, path);
    assert.doesNotMatch(text, /ValidatorTabs/, path);
  }
});
