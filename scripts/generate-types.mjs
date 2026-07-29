import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const repositoryRoot = new URL("../", import.meta.url);
const outputUrl = new URL("types/index.d.ts", repositoryRoot);

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, repositoryRoot), "utf8"));

const literal = (value) => JSON.stringify(value);
const union = (values) => [...new Set(values)].map(literal).join(" | ");

export function schemaType(schema) {
  if (schema.$ref) return schema.$ref.split("/").at(-1).replace(/^Agent/, "Adp1Agent");
  if (Object.hasOwn(schema, "const")) return literal(schema.const);
  if (schema.enum) return union(schema.enum);
  if (Array.isArray(schema.type)) {
    return schema.type.map((type) => schemaType({ ...schema, type })).join(" | ");
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return `ReadonlyArray<${schemaType(schema.items ?? {})}>`;
    case "object": {
      if (!schema.properties) return "Readonly<Record<string, unknown>>";
      const required = new Set(schema.required ?? []);
      const properties = Object.entries(schema.properties).map(
        ([name, property]) =>
          `readonly ${JSON.stringify(name)}${required.has(name) ? "" : "?"}: ${schemaType(property)};`,
      );
      if (schema.additionalProperties !== false) {
        properties.push("readonly [key: string]: unknown;");
      }
      return `{ ${properties.join(" ")} }`;
    }
    default:
      return "unknown";
  }
}

function interfaceFromSchema(name, schema) {
  const required = new Set(schema.required ?? []);
  const properties = Object.entries(schema.properties ?? {}).map(
    ([propertyName, property]) =>
      `  readonly ${JSON.stringify(propertyName)}${required.has(propertyName) ? "" : "?"}: ${schemaType(property)};`,
  );
  if (schema.additionalProperties !== false) properties.push("  readonly [key: string]: unknown;");
  return `export interface ${name} {\n${properties.join("\n")}\n}`;
}

function aipTypes(contract) {
  const constants = union(contract.extensions.map(({ constant }) => constant));
  const dataTypes = union(contract.extensions.map(({ dataType }) => dataType));
  const levels = contract.conformance.levels.map(({ level }) => level).join(" | ");
  const valueEntries = contract.extensions.map(({ constant, valueSchema }) => {
    const valueType = valueSchema.type === "array" ? "ReadonlyArray<string>" : schemaType(valueSchema);
    return `  readonly ${constant}: ${valueType};`;
  });

  return `export type Aip1ExtensionConstant = ${constants};
export type Aip1ExtensionDataType = ${dataTypes};
export type Aip1ConformanceLevel = ${levels};

export interface Aip1ExtensionValueByConstant {
${valueEntries.join("\n")}
}

export interface Aip1Extension<C extends Aip1ExtensionConstant = Aip1ExtensionConstant> {
  readonly constant: C;
  readonly suffix: number;
  readonly name: string;
  readonly dataType: Aip1ExtensionDataType;
  readonly example: string;
  readonly valueSchema: Readonly<Record<string, unknown>>;
  readonly description: string;
}

export interface Aip1Contract {
  readonly id: ${literal(contract.id)};
  readonly oidBase: string;
  readonly certificateLifetime: {
    readonly maximumMinutes: number;
    readonly recommendedMinutes: number;
    readonly issuerBackdateMinutes: { readonly minimum: number; readonly maximum: number };
    readonly verifierGraceSeconds: number;
    readonly maximumClockDriftSeconds: number;
  };
  readonly extensions: ReadonlyArray<Aip1Extension>;
  readonly conformance: {
    readonly levels: ReadonlyArray<{
      readonly level: Aip1ConformanceLevel;
      readonly name: string;
      readonly enforceMaximumLifetime: boolean;
      readonly enforceMaximumClockDrift: boolean;
      readonly requiredExtensions: ReadonlyArray<Aip1ExtensionConstant>;
      readonly conditionalExtensions: ReadonlyArray<{ readonly constant: Aip1ExtensionConstant; readonly condition: string }>;
      readonly validateExtensions: ReadonlyArray<Aip1ExtensionConstant>;
      readonly additionalRequirements: ReadonlyArray<string>;
    }>;
  };
}`;
}

function ctxTypes(contract) {
  return `export type Ctx1ReservedPrefix = ${union(contract.reservedPrefixes.map(({ prefix }) => prefix))};

export interface Ctx1Contract {
  readonly id: ${literal(contract.id)};
  readonly grammar: {
    readonly separator: string;
    readonly minimumSegments: number;
    readonly segmentCharacters: {
      readonly lowercaseAsciiLetters: boolean;
      readonly digits: boolean;
      readonly symbols: ReadonlyArray<string>;
    };
    readonly recommendedMaximumLength: number;
    readonly namesShouldBeStable: boolean;
    readonly unknownCapabilities: string;
    readonly prefixMayContainSeparator: boolean;
  };
  readonly reservedPrefixes: ReadonlyArray<{
    readonly prefix: Ctx1ReservedPrefix;
    readonly purpose: string;
    readonly examples: ReadonlyArray<string>;
  }>;
  readonly invalidExamples: ReadonlyArray<string>;
}`;
}

async function render() {
  const [aip, ctx, adp, pvs] = await Promise.all([
    readJson("contracts/aip-1.json"),
    readJson("contracts/ctx-1.json"),
    readJson("schemas/adp-1.schema.json"),
    readJson("schemas/pvs-1.schema.json"),
  ]);

  return `// GENERATED by scripts/generate-types.mjs from the public machine contracts.
// Do not edit this file directly.

${aipTypes(aip)}

${ctxTypes(ctx)}

export type Adp1ActionType = ${union(adp.$defs.AgentStep.properties.action.properties.type.enum)};
export type Adp1ObservationType = ${union(adp.$defs.AgentStep.properties.observation.properties.type.enum)};
export type Adp1RunStatus = ${union(adp.properties.status.enum)};

${interfaceFromSchema("Adp1AgentStep", adp.$defs.AgentStep)}

${interfaceFromSchema("Adp1AgentRun", adp)}

export type Pvs1Decision = ${union(pvs.properties.decision.enum)};

${interfaceFromSchema("Pvs1PolicyVerdict", pvs)}
`;
}

const expected = await render();
if (process.argv.includes("--check")) {
  let actual;
  try {
    actual = await readFile(outputUrl, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    actual = "";
  }
  if (actual !== expected) {
    process.stderr.write("Generated TypeScript contracts are stale; run npm run generate:types.\n");
    process.exitCode = 1;
  }
} else {
  await mkdir(new URL("types/", repositoryRoot), { recursive: true });
  await writeFile(outputUrl, expected, "utf8");
}
