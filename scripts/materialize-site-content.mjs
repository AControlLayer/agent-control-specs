import { mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepositoryRoot = fileURLToPath(new URL("../", import.meta.url));

// Every draft in this repository was withdrawn on this date. The public site
// never renders a draft's text: each document under specs/ becomes a notice
// page at the same URL, so inbound links keep working and say what happened.
export const WITHDRAWAL_DATE = "2026-08-08";
export const WITHDRAWAL_STATEMENT =
  "This draft was withdrawn on August 8, 2026. It is kept for historical reference and is not a standard, and no product conforms to it.";
export const HISTORICAL_SOURCE_BASE =
  "https://github.com/AControlLayer/agent-control-specs/blob/main/";

// Authored roots under the repository, and the site paths generated from them.
export const SITE_PROJECTIONS = Object.freeze([
  { source: "specs", destination: join("pages", "docs") },
]);

const ignoreStartMarker = "# spec-contract:generated-site-projections:start";
const ignoreEndMarker = "# spec-contract:generated-site-projections:end";
const noticeStartMarker = "<!-- withdrawal-notice:start -->";
const noticeEndMarker = "<!-- withdrawal-notice:end -->";

export function renderSiteProjectionIgnoreRules() {
  return [
    ignoreStartMarker,
    "/.generated/",
    ...SITE_PROJECTIONS.map(({ destination }) => `/${destination.replaceAll("\\", "/")}`),
    ignoreEndMarker,
    "",
  ].join("\n");
}

export function extractSiteProjectionIgnoreRules(ignoreSource) {
  const startCount = ignoreSource.split(ignoreStartMarker).length - 1;
  const endCount = ignoreSource.split(ignoreEndMarker).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(
      "Generated site projection ignores require exactly one start marker and one end marker",
    );
  }
  const start = ignoreSource.indexOf(ignoreStartMarker);
  const end = ignoreSource.indexOf(ignoreEndMarker);
  if (end <= start) {
    throw new Error("Generated site projection ignore markers are not in correct order");
  }
  return ignoreSource.slice(start, end + ignoreEndMarker.length).trim();
}

export function parseFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!match) return {};
  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^"(.*)"$/, "$1").trim()]),
  );
}

export function extractWithdrawalNotice(source, label = "document") {
  const startCount = source.split(noticeStartMarker).length - 1;
  const endCount = source.split(noticeEndMarker).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(`${label} requires exactly one withdrawal notice start marker and one end marker`);
  }
  const start = source.indexOf(noticeStartMarker);
  const end = source.indexOf(noticeEndMarker);
  if (end <= start) {
    throw new Error(`${label} withdrawal notice markers are not in correct order`);
  }
  return source.slice(start + noticeStartMarker.length, end).trim();
}

export function documentTitle(source, label = "document") {
  const heading = /^# (.+)$/m.exec(source);
  if (!heading) throw new Error(`${label} has no top-level heading`);
  return heading[1].trim();
}

// A draft (a document that declares `spec:` or `status:` in its frontmatter)
// must be marked withdrawn on the withdrawal date and carry the statement.
export function assertWithdrawn(source, label = "document") {
  const frontmatter = parseFrontmatter(source);
  const notice = extractWithdrawalNotice(source, label);
  if (frontmatter.status !== undefined && frontmatter.status !== "Withdrawn") {
    throw new Error(`${label} status is "${frontmatter.status}", not "Withdrawn"`);
  }
  if (frontmatter.status !== undefined && frontmatter.withdrawn !== WITHDRAWAL_DATE) {
    throw new Error(`${label} withdrawn date is "${frontmatter.withdrawn}", not ${WITHDRAWAL_DATE}`);
  }
  if (frontmatter.spec !== undefined && !notice.includes(WITHDRAWAL_STATEMENT)) {
    throw new Error(`${label} withdrawal notice does not carry the withdrawal statement`);
  }
  return notice;
}

export function renderWithdrawnPage({ source, sourcePath, siblingNames }) {
  const notice = assertWithdrawn(source, sourcePath);
  // Links between documents in specs/ point at their notice pages on the site.
  const siteNotice = notice.replace(/\]\(([A-Za-z0-9_.-]+)\.md\)/g, (link, name) =>
    siblingNames.has(name) ? `](/docs/${name})` : link,
  );
  return [
    `# ${documentTitle(source, sourcePath)}`,
    "",
    siteNotice,
    "",
    "---",
    "",
    `The historical text is kept in the repository as [${sourcePath}](${HISTORICAL_SOURCE_BASE}${sourcePath}). ` +
      "It is not published on this site.",
    "",
  ].join("\n");
}

export async function renderWithdrawnPages(sourceDirectory, sourceRoot) {
  const names = (await readdir(sourceDirectory))
    .filter((name) => name.endsWith(".md"))
    .sort();
  const siblingNames = new Set(names.map((name) => basename(name, ".md")));
  return Promise.all(
    names.map(async (name) => {
      const sourcePath = `${sourceRoot}/${name}`;
      const source = await readFile(join(sourceDirectory, name), "utf8");
      const { spec } = parseFrontmatter(source);
      return {
        name,
        spec,
        title: documentTitle(source, sourcePath),
        content: renderWithdrawnPage({ source, sourcePath, siblingNames }),
      };
    }),
  );
}

// Sidebar labels and order: the withdrawal record first, then the drafts, then
// everything else. Every label says the document is withdrawn.
export function renderSidebarMeta(pages) {
  const rank = ({ name, spec }) => (name === "README.md" ? 0 : spec ? 1 : 2);
  const entries = [...pages]
    .sort((left, right) => rank(left) - rank(right) || left.name.localeCompare(right.name))
    .map((page) => {
      const label =
        page.name === "README.md"
          ? "Withdrawal record"
          : `${page.spec ?? page.title} (withdrawn)`;
      return `  ${JSON.stringify(basename(page.name, ".md"))}: ${JSON.stringify(label)},`;
    });
  return ["export default {", ...entries, "}", ""].join("\n");
}

export async function materializeSiteContent({
  repositoryRoot = defaultRepositoryRoot,
  siteRoot = join(repositoryRoot, "site"),
} = {}) {
  const generatedRoot = join(siteRoot, ".generated");
  await rm(generatedRoot, { recursive: true, force: true });

  for (const { source, destination } of SITE_PROJECTIONS) {
    const generatedPath = join(generatedRoot, destination);
    const destinationPath = join(siteRoot, destination);
    const pages = await renderWithdrawnPages(join(repositoryRoot, source), source);
    await rm(destinationPath, { recursive: true, force: true });
    await mkdir(generatedPath, { recursive: true });
    await mkdir(dirname(destinationPath), { recursive: true });
    for (const { name, content } of pages) {
      await writeFile(join(generatedPath, name), content);
    }
    await writeFile(join(generatedPath, "_meta.js"), renderSidebarMeta(pages));
    await symlink(relative(dirname(destinationPath), generatedPath), destinationPath, "dir");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await materializeSiteContent();
  process.stdout.write("Materialized withdrawal notice pages from canonical authored roots.\n");
}
