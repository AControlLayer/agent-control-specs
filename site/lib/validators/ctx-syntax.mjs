const patterns = new WeakMap();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeCharacterClass = (value) => value.replace(/[\\\]\-^]/g, "\\$&");

export function compileCtxCapabilityPattern(ctxContract) {
  const cached = patterns.get(ctxContract);
  if (cached) return cached;
  const grammar = ctxContract.grammar;
  const characters = [
    grammar.segmentCharacters.lowercaseAsciiLetters ? "a-z" : "",
    grammar.segmentCharacters.digits ? "0-9" : "",
    ...grammar.segmentCharacters.symbols.map(escapeCharacterClass),
  ].join("");
  const segment = `[${characters}]+`;
  const separator = escapeRegex(grammar.separator);
  const pattern = new RegExp(
    `^${segment}(?:${separator}${segment}){${grammar.minimumSegments - 1},}$`,
  );
  patterns.set(ctxContract, pattern);
  return pattern;
}

export const isCtxCapability = (value, ctxContract) =>
  compileCtxCapabilityPattern(ctxContract).test(value);

export const exceedsCtxRecommendedLength = (value, ctxContract) =>
  value.length > ctxContract.grammar.recommendedMaximumLength;
