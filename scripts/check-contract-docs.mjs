import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRepositoryRoot = new URL("../", import.meta.url);

const marker = (sectionId, boundary) =>
  `<!-- spec-contract:${sectionId}:${boundary} -->`;

const asDirectoryUrl = (repositoryRoot) => {
  if (repositoryRoot instanceof URL) {
    return repositoryRoot;
  }
  return pathToFileURL(`${resolve(repositoryRoot)}${sep}`);
};

export function extractContractSection(markdown, sectionId) {
  const startMarker = marker(sectionId, "start");
  const endMarker = marker(sectionId, "end");
  const startCount = markdown.split(startMarker).length - 1;
  const endCount = markdown.split(endMarker).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(
      `Generated section ${sectionId} requires exactly one start marker and one end marker`,
    );
  }
  const start = markdown.indexOf(startMarker);
  const end = markdown.indexOf(endMarker);

  if (end <= start) {
    throw new Error(`Generated section markers for ${sectionId} are not in correct order`);
  }

  return markdown.slice(start + startMarker.length, end).trim();
}

const extensionOid = (contract, extension) =>
  `${contract.oidBase}.${extension.suffix}`;

export function replaceContractSection(markdown, sectionId, content) {
  extractContractSection(markdown, sectionId);
  const startMarker = marker(sectionId, "start");
  const endMarker = marker(sectionId, "end");
  const start = markdown.indexOf(startMarker);
  const end = markdown.indexOf(endMarker) + endMarker.length;
  return `${markdown.slice(0, start)}${startMarker}\n${content}\n${endMarker}${markdown.slice(end)}`;
}

export function renderAipExtensionTable(contract) {
  const rows = contract.extensions.map(
    (extension) =>
      `| \`${extensionOid(contract, extension)}\` | **${extension.name}** | \`${extension.dataType}\` | ${extension.description} | ${extension.valueSchema.description} |`,
  );

  return [
    "| OID | Name | Data Type | Description | Value Rule |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...rows,
  ].join("\n");
}

export function renderAipLifetime(contract) {
  const lifetime = contract.certificateLifetime;
  return [
    `- **Maximum Validity**: ${lifetime.maximumMinutes} minutes.`,
    `- **RECOMMENDED Validity**: ${lifetime.recommendedMinutes} minutes.`,
    `- **Clock Skew Tolerance**: Issuers SHOULD backdate the \`notBefore\` time by ${lifetime.issuerBackdateMinutes.minimum}–${lifetime.issuerBackdateMinutes.maximum} minutes to account for clock skew. Verifiers SHOULD allow a grace period of ±${lifetime.verifierGraceSeconds} seconds when enforcing validity, and all participating systems MUST synchronize to NTP with drift <${lifetime.maximumClockDriftSeconds} seconds.`,
  ].join("\n");
}

const extensionIndex = (contract) =>
  Object.fromEntries(
    contract.extensions.map((extension) => [extension.constant, extension]),
  );

export function renderAipConformance(contract) {
  const extensions = extensionIndex(contract);
  const sections = contract.conformance.levels.map((level) => {
    const requirements = [];
    if (level.enforceMaximumLifetime) {
      requirements.push(
        `Issue X.509 v3 certificates with validity ≤ ${contract.certificateLifetime.maximumMinutes} minutes`,
      );
    }
    for (const constant of level.requiredExtensions) {
      const extension = extensions[constant];
      const validation = level.validateExtensions.includes(constant)
        ? ` and validate ${extension.name.replace(/^AIP-/, "").toLowerCase()} matching`
        : "";
      requirements.push(
        `Include ${extension.name} (OID \`${extensionOid(contract, extension)}\`) in all certificates${validation}`,
      );
    }
    for (const { constant, condition } of level.conditionalExtensions) {
      const extension = extensions[constant];
      requirements.push(
        `Include ${extension.name} (OID \`${extensionOid(contract, extension)}\`) when ${condition}`,
      );
    }
    if (level.enforceMaximumClockDrift) {
      requirements.push(
        `Support NTP synchronization with <${contract.certificateLifetime.maximumClockDriftSeconds} second drift`,
      );
    }
    requirements.push(...level.additionalRequirements);

    return [
      `**Level ${level.level} (${level.name})**: An implementation MUST${level.level > 1 ? " also" : ""}:`,
      ...requirements.map((requirement) => `- ${requirement}`),
    ].join("\n");
  });

  return sections.join("\n\n");
}

const formatList = (items) => {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}, or ${items.at(-1)}`;
};

export function renderCtxGrammar(contract) {
  const grammar = contract.grammar;
  const separator = grammar.separator;
  const allowedCharacters = [];
  if (grammar.segmentCharacters.lowercaseAsciiLetters) {
    allowedCharacters.push("lowercase ASCII letters");
  }
  if (grammar.segmentCharacters.digits) {
    allowedCharacters.push("digits");
  }
  allowedCharacters.push(
    ...grammar.segmentCharacters.symbols.map((symbol) => `\`${symbol}\``),
  );
  const examples = contract.reservedPrefixes
    .flatMap(({ examples: prefixExamples }) => prefixExamples.slice(0, 1))
    .map((example) => `- \`${example}\``);
  const rules = [
    `1. Segments MUST contain only ${formatList(allowedCharacters)}`,
    grammar.namesShouldBeStable
      ? "2. Names SHOULD be stable over time; when behavior changes significantly, prefer a new capability name"
      : null,
    grammar.unknownCapabilities === "ignore"
      ? "3. Unknown capabilities MUST be ignored (fail-safe) by consumers who do not understand them"
      : null,
    grammar.prefixMayContainSeparator
      ? null
      : `4. Prefixes MUST NOT contain the \`${separator}\` separator`,
    `5. The total string length SHOULD NOT exceed ${grammar.recommendedMaximumLength} characters`,
  ].filter(Boolean);

  return [
    "Capabilities are simple strings with the following pattern:",
    "",
    "```text",
    `<prefix>${separator}<name>[${separator}<qualifier>...]`,
    "```",
    "",
    "**Examples:**",
    ...examples,
    "",
    "**Rules:**",
    "",
    ...rules,
  ].join("\n");
}

export function renderCtxReservedPrefixTable(contract) {
  const rows = contract.reservedPrefixes.map(
    ({ prefix, purpose, examples }) =>
      `| \`${prefix}${contract.grammar.separator}\` | ${purpose} | ${examples.map((example) => `\`${example}\``).join(", ")} |`,
  );

  return [
    "| Prefix | Purpose | Examples |",
    "|--------|---------|----------|",
    ...rows,
  ].join("\n");
}

export function renderAipExampleExtensionTable(contract) {
  return [
    "| OID | Name | Example Value |",
    "|-----|------|---------------|",
    ...contract.extensions.map((extension) =>
      `| \`${extensionOid(contract, extension)}\` | ${extension.name} | \`${extension.example}\` |`,
    ),
  ].join("\n");
}

const jsonType = (definition) => {
  if (definition.type === "array") return "array";
  if (definition.type === "object") return "object";
  return definition.type;
};

export function renderPvsRequiredFields(schema) {
  const required = new Set(schema.required);
  const rows = Object.entries(schema.properties).map(([name, definition]) =>
    `| \`${name}\` | ${jsonType(definition)} | ${required.has(name) ? "required" : "optional"} | ${definition.description} |`,
  );
  const decisionValues = schema.properties.decision.enum.map(
    (decision) => `- \`${decision}\``,
  );
  return [
    "| Field | Type | Presence | Schema description |",
    "|---|---|---|---|",
    ...rows,
    "",
    "**Decision values:**",
    ...decisionValues,
    "",
    "Consumers MUST ignore unknown keys in `metadata`.",
  ].join("\n");
}

const pvsPolicy = (schema) => schema["x-acontrollayer-policy"];

export function renderPvsConstraints(schema) {
  const { minimum, maximum } = schema.properties.confidence_score;
  const threshold = pvsPolicy(schema).escalationConfidenceThreshold;
  return [
    "- When `decision` is `allow`, `approved` MUST be `true` and `policy_violations` MUST be empty.",
    "- When `decision` is `deny` or `escalate`, `approved` MUST be `false`.",
    `- \`confidence_score\` MUST be between ${minimum} and ${maximum} inclusive.`,
    `- Confidence below ${threshold} SHOULD result in \`decision: \"escalate\"\`.`,
  ].join("\n");
}

export function renderPvsDecisionRules(schema) {
  const threshold = pvsPolicy(schema).escalationConfidenceThreshold;
  return [
    "1. **Clear violation detected** → `decision: \"deny\"`",
    `2. **No violations, confidence ≥ ${threshold}** → \`decision: \"allow\"\``,
    `3. **Uncertain or confidence < ${threshold}** → \`decision: \"escalate\"\``,
  ].join("\n");
}

export function renderPvsEscalationTriggers(schema) {
  const policy = pvsPolicy(schema);
  return [
    "**Recommended escalation triggers:**",
    `- Confidence score below ${policy.escalationConfidenceThreshold}`,
    ...policy.additionalEscalationTriggers.map((trigger) => `- ${trigger}`),
  ].join("\n");
}

export function renderPvsSecurityThreshold(schema) {
  const threshold = pvsPolicy(schema).escalationConfidenceThreshold;
  return [
    `- \`confidence_score >= ${threshold}\`: the policy decision MAY be auto-enforced.`,
    `- \`confidence_score < ${threshold}\`: the verdict SHOULD be queued for human review.`,
  ].join("\n");
}

export function renderPvsConformance(schema) {
  return pvsPolicy(schema).conformanceLevels.map((level) => [
    `**Level ${level.level} (${level.name})**: An implementation MUST${level.level > 1 ? " also" : ""}:`,
    ...level.requirements.map((requirement) => `- ${requirement}`),
  ].join("\n")).join("\n\n");
}

const typescriptType = (definition, indentation = "") => {
  if (definition.const !== undefined) return JSON.stringify(definition.const);
  if (definition.enum) return definition.enum.map(JSON.stringify).join(" | ");
  if (definition.type === "array") return `${typescriptType(definition.items, indentation)}[]`;
  if (definition.type === "object") {
    const required = new Set(definition.required ?? []);
    const members = Object.entries(definition.properties ?? {}).map(
      ([name, property]) =>
        `${indentation}  ${name}${required.has(name) ? "" : "?"}: ${typescriptType(property, `${indentation}  `)};`,
    );
    return ["{", ...members, `${indentation}}`].join("\n");
  }
  if (definition.type === "integer") return "number";
  return definition.type;
};

export function renderPvsTypescriptInterface(schema) {
  const decision = schema.properties.decision;
  const required = new Set(schema.required);
  const members = Object.entries(schema.properties).map(([name, definition]) => {
    const type = name === "decision" ? "PolicyDecision" : typescriptType(definition, "  ");
    return `  ${name}${required.has(name) ? "" : "?"}: ${type};`;
  });
  return [
    "```typescript",
    `type PolicyDecision = ${typescriptType(decision)};`,
    "",
    "interface PolicyEvaluation {",
    ...members,
    "}",
    "```",
  ].join("\n");
}

const loadProjectionDefinitions = async (repositoryRoot) => {
  const root = asDirectoryUrl(repositoryRoot);
  const readJson = async (relativePath) =>
    JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
  const [aipContract, ctxContract, pvsSchema] = await Promise.all([
    readJson("contracts/aip-1.json"),
    readJson("contracts/ctx-1.json"),
    readJson("schemas/pvs-1.schema.json"),
  ]);

  return [
    {
      path: "specs/AIP-1.md",
      id: "aip-1-extensions",
      expected: renderAipExtensionTable(aipContract),
    },
    {
      path: "specs/AIP-1.md",
      id: "aip-1-lifetime",
      expected: renderAipLifetime(aipContract),
    },
    {
      path: "specs/AIP-1.md",
      id: "aip-1-conformance",
      expected: renderAipConformance(aipContract),
    },
    {
      path: "specs/CTX-1.md",
      id: "ctx-1-grammar",
      expected: renderCtxGrammar(ctxContract),
    },
    {
      path: "specs/CTX-1.md",
      id: "ctx-1-reserved-prefixes",
      expected: renderCtxReservedPrefixTable(ctxContract),
    },
    {
      path: "examples/certificates/README.md",
      id: "aip-1-example-extensions",
      expected: renderAipExampleExtensionTable(aipContract),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-required-fields",
      expected: renderPvsRequiredFields(pvsSchema),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-constraints",
      expected: renderPvsConstraints(pvsSchema),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-decision-rules",
      expected: renderPvsDecisionRules(pvsSchema),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-typescript-interface",
      expected: renderPvsTypescriptInterface(pvsSchema),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-security-threshold",
      expected: renderPvsSecurityThreshold(pvsSchema),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-escalation-triggers",
      expected: renderPvsEscalationTriggers(pvsSchema),
    },
    {
      path: "specs/PVS-1.md",
      id: "pvs-1-conformance",
      expected: renderPvsConformance(pvsSchema),
    },
  ];
};

export async function checkContractDocs({ repositoryRoot = defaultRepositoryRoot } = {}) {
  const root = asDirectoryUrl(repositoryRoot);
  const definitions = await loadProjectionDefinitions(root);
  const failures = [];

  for (const definition of definitions) {
    try {
      const source = await readFile(new URL(definition.path, root), "utf8");
      if (extractContractSection(source, definition.id) !== definition.expected) {
        failures.push(`${definition.path}#${definition.id} is stale`);
      }
    } catch (error) {
      failures.push(`${definition.path}#${definition.id}: ${error.message}`);
    }
  }

  return failures;
}

export async function writeContractDocs({ repositoryRoot = defaultRepositoryRoot } = {}) {
  const root = asDirectoryUrl(repositoryRoot);
  const definitions = await loadProjectionDefinitions(root);
  const documents = new Map();

  for (const definition of definitions) {
    const current =
      documents.get(definition.path) ??
      (await readFile(new URL(definition.path, root), "utf8"));
    documents.set(
      definition.path,
      replaceContractSection(current, definition.id, definition.expected),
    );
  }

  await Promise.all(
    [...documents].map(([path, source]) =>
      writeFile(new URL(path, root), source),
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write")) {
    await writeContractDocs();
    process.stdout.write("Wrote contract-backed Markdown projections.\n");
  } else {
    const failures = await checkContractDocs();
    if (failures.length > 0) {
      for (const failure of failures) {
        process.stderr.write(`${failure}\n`);
      }
      process.exitCode = 1;
    } else {
      process.stdout.write("Contract-backed Markdown projections are fresh.\n");
    }
  }
}
