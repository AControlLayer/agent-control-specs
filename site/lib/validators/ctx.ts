import ctxContract from '../../../contracts/ctx-1.json';
import {
  exceedsCtxRecommendedLength,
  isCtxCapability,
} from './ctx-syntax.mjs';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export const CTX_RESERVED_PREFIXES = ctxContract.reservedPrefixes.map(
  ({ prefix }) => prefix,
);
const reservedPrefixSet = new Set(CTX_RESERVED_PREFIXES);

export function validateCtx(input: string): ValidationResult {
  if (!input || !input.trim()) {
      return { valid: false, message: 'Input is empty' };
  }
  
  const valid = isCtxCapability(input, ctxContract);
  if (valid) {
    const prefix = input.slice(0, input.indexOf(ctxContract.grammar.separator));
    const namespace = reservedPrefixSet.has(prefix) ? 'reserved' : 'implementation-defined';
    if (exceedsCtxRecommendedLength(input, ctxContract)) {
      return {
        valid: true,
        message: `Valid CTX-1 capability string with ${namespace} prefix, but it exceeds the recommended maximum length of ${ctxContract.grammar.recommendedMaximumLength} characters`,
      };
    }
    return { valid: true, message: `Valid CTX-1 capability string with ${namespace} prefix` };
  } else {
    return { valid: false, message: 'Invalid format. The value does not match the canonical CTX-1 grammar.' };
  }
}
