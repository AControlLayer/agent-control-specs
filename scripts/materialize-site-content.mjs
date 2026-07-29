import { cp, mkdir, rm, symlink } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepositoryRoot = fileURLToPath(new URL("../", import.meta.url));

export const SITE_PROJECTIONS = Object.freeze([
  { source: "specs", destination: join("pages", "docs") },
  { source: "schemas", destination: "schemas" },
  { source: "examples", destination: "examples" },
]);

const ignoreStartMarker = "# spec-contract:generated-site-projections:start";
const ignoreEndMarker = "# spec-contract:generated-site-projections:end";

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

export async function materializeSiteContent({
  repositoryRoot = defaultRepositoryRoot,
  siteRoot = join(repositoryRoot, "site"),
} = {}) {
  const generatedRoot = join(siteRoot, ".generated");
  await rm(generatedRoot, { recursive: true, force: true });

  for (const { source, destination } of SITE_PROJECTIONS) {
    const generatedPath = join(generatedRoot, destination);
    const destinationPath = join(siteRoot, destination);
    await rm(destinationPath, { recursive: true, force: true });
    await mkdir(dirname(generatedPath), { recursive: true });
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(join(repositoryRoot, source), generatedPath, { recursive: true });
    await symlink(relative(dirname(destinationPath), generatedPath), destinationPath, "dir");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await materializeSiteContent();
  process.stdout.write("Materialized public site content from canonical authored roots.\n");
}
