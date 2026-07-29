import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { isCtxCapability } from "./ctx-syntax.mjs";

const TAGS = Object.freeze({ INTEGER: 0x02, UTF8String: 0x0c, IA5String: 0x16 });

const bytesOf = (value) =>
  value instanceof Uint8Array
    ? value
    : new Uint8Array(value.buffer ?? value, value.byteOffset ?? 0, value.byteLength);

const encodeLength = (length) => {
  if (length < 0x80) return Uint8Array.of(length);
  const octets = [];
  for (let remaining = length; remaining > 0; remaining = Math.floor(remaining / 256)) {
    octets.unshift(remaining & 0xff);
  }
  return Uint8Array.of(0x80 | octets.length, ...octets);
};

const encodeTlv = (tag, value) => {
  const length = encodeLength(value.length);
  return Uint8Array.of(tag, ...length, ...value);
};

const encodeInteger = (value) => {
  let integer;
  try {
    integer = BigInt(value);
  } catch {
    throw new Error("INTEGER value must be a base-10 integer");
  }
  if (integer < 0n) throw new Error("AIP INTEGER values must be non-negative");
  const octets = [];
  do {
    octets.unshift(Number(integer & 0xffn));
    integer >>= 8n;
  } while (integer > 0n);
  if (octets[0] & 0x80) octets.unshift(0);
  return Uint8Array.from(octets);
};

export function encodeAipDerValue(dataType, value) {
  const tag = TAGS[dataType];
  if (tag === undefined) throw new Error(`Unsupported AIP DER data type: ${dataType}`);
  let content;
  if (dataType === "INTEGER") {
    content = encodeInteger(value);
  } else {
    if (dataType === "IA5String" && [...value].some((character) => character.codePointAt(0) > 0x7f)) {
      throw new Error("IA5String values must contain ASCII characters only");
    }
    content = new TextEncoder().encode(value);
  }
  return encodeTlv(tag, content);
}

const decodeTlv = (dataType, value) => {
  const bytes = bytesOf(value);
  if (bytes.length < 2) throw new Error("Invalid DER value: truncated header");
  if (bytes[0] !== TAGS[dataType]) throw new Error(`Invalid DER tag for ${dataType}`);
  let offset = 2;
  let length = bytes[1];
  if (length & 0x80) {
    const count = length & 0x7f;
    if (count === 0 || count > 4 || offset + count > bytes.length) {
      throw new Error("Invalid DER length encoding");
    }
    if (bytes[offset] === 0) throw new Error("Invalid non-canonical DER length");
    length = 0;
    for (let index = 0; index < count; index += 1) {
      length = length * 256 + bytes[offset + index];
    }
    if (length < 0x80) throw new Error("Invalid non-canonical DER length");
    offset += count;
  }
  if (offset + length !== bytes.length) throw new Error("Invalid DER value length");
  return bytes.subarray(offset);
};

const decodeAipDerValue = (dataType, value) => {
  const content = decodeTlv(dataType, value);
  if (dataType === "INTEGER") {
    if (content.length === 0 || content[0] & 0x80) throw new Error("Invalid DER INTEGER");
    if (content.length > 1 && content[0] === 0 && !(content[1] & 0x80)) {
      throw new Error("Invalid non-canonical DER INTEGER");
    }
    let integer = 0n;
    for (const octet of content) integer = (integer << 8n) | BigInt(octet);
    if (integer > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("DER INTEGER exceeds the supported safe-integer range");
    }
    return Number(integer);
  }
  if (dataType === "IA5String" && content.some((octet) => octet > 0x7f)) {
    throw new Error("Invalid DER IA5String: non-ASCII octet");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    throw new Error(`Invalid DER ${dataType} encoding`);
  }
};

const semanticValue = (extension, decoded) => {
  const type = extension.valueSchema.type;
  if (type === "integer") {
    const integer = typeof decoded === "number" ? decoded : Number(decoded);
    if (!Number.isSafeInteger(integer)) {
      throw new Error(`${extension.name} must contain a safe integer`);
    }
    return integer;
  }
  if (type === "array" || type === "object") {
    try {
      return JSON.parse(decoded);
    } catch {
      throw new Error(`${extension.name} must contain a valid JSON ${type}`);
    }
  }
  return decoded;
};

const semanticValidator = (extension, ctxContract) => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addFormat("ctx-1-capability", {
    type: "string",
    validate: (value) => isCtxCapability(value, ctxContract),
  });
  return ajv.compile(extension.valueSchema);
};

const assertSemanticValue = (extension, value, ctxContract) => {
  const validate = semanticValidator(extension, ctxContract);
  if (!validate(value)) {
    throw new Error(
      `Invalid semantic value for ${extension.name}: ${ajvErrors(validate.errors)}`,
    );
  }
};

const ajvErrors = (errors) =>
  (errors ?? []).map(({ instancePath, message }) => `${instancePath || "value"} ${message}`).join("; ");

export function encodeAipExtensionValue(extension, value, ctxContract) {
  const logical = semanticValue(extension, value);
  assertSemanticValue(extension, logical, ctxContract);
  const derInput = extension.valueSchema.type === "array" || extension.valueSchema.type === "object"
    ? JSON.stringify(logical)
    : String(logical);
  return encodeAipDerValue(extension.dataType, derInput);
}

export function validateAipExtensionValue(extension, value, ctxContract) {
  const decoded = decodeAipDerValue(extension.dataType, value);
  const logical = semanticValue(extension, decoded);
  assertSemanticValue(extension, logical, ctxContract);
  return logical;
}
