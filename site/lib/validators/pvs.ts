import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
// @ts-ignore
import schema from '../../../schemas/pvs-1.schema.json';

const ajv = new Ajv({ allErrors: true });
ajv.addKeyword('x-acontrollayer-policy');
addFormats(ajv);
const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: any[];
}

export function validatePvs(data: any): ValidationResult {
  const valid = validate(data);
  return {
    valid: !!valid,
    errors: validate.errors || [],
  };
}
