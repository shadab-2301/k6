import Ajv, { ValidateFunction } from "ajv";
import * as fs from "fs";
import * as path from "path";

/**
 * Validates API response bodies against JSON Schema fixtures referenced by
 * "responseSchema" in api-registry.json. Schemas live under
 * apps/test/resources/response-schemas/ so they sit alongside request-body
 * fixtures under the same test/resources root.
 */
const RESPONSE_SCHEMAS_ROOT = path.resolve(__dirname, "../../../../test/resources/response-schemas");

const ajv = new Ajv({ allErrors: true, strict: false });
const compiledSchemaCache = new Map<string, ValidateFunction>();

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

function loadAndCompileSchema(schemaPath: string): ValidateFunction {
  const cached = compiledSchemaCache.get(schemaPath);
  if (cached) return cached;

  const normalized = schemaPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const fullPath = path.resolve(RESPONSE_SCHEMAS_ROOT, normalized);

  if (!fullPath.startsWith(RESPONSE_SCHEMAS_ROOT)) {
    throw new Error(`Response schema path "${schemaPath}" resolves outside of ${RESPONSE_SCHEMAS_ROOT}.`);
  }

  const schema = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  const validate = ajv.compile(schema);
  compiledSchemaCache.set(schemaPath, validate);
  return validate;
}

export function validateAgainstSchema(schemaPath: string, data: any): SchemaValidationResult {
  const validate = loadAndCompileSchema(schemaPath);
  const valid = validate(data) as boolean;
  const errors = (validate.errors || []).map((e) => `${e.instancePath || "/"} ${e.message}`);
  return { valid, errors };
}
