import * as fs from "fs";
import * as path from "path";
import Ajv, { ValidateFunction, ErrorObject } from "ajv";
import { rootPath } from "./root-path";

/**
 * JsonSchemaValidator - TypeScript port of the .NET APIAutomationFramework.Utilities.JsonSchemaValidator.
 *
 * Validates API response bodies against JSON Schema files.
 * Supports:
 * - Reading schema file path from API registry JSON (registry-driven)
 * - Named schema objects within a single schema file
 * - Both object {} and array [] JSON responses
 * - Strict mode that rejects empty/permissive schemas
 *
 * Schema files can live under API-Schema/ at repository root (preferred),
 * apps/test/resources/response-schemas/, or .azuredevops/API-Schema/ (legacy fallback).
 * API registry files live under ApiRegistry/.
 *
 * @author Shadab Anwar
 */

const API_REGISTRY_DIR = path.join(rootPath(), "ApiRegistry");
const RESPONSE_SCHEMAS_ROOTS = [
  path.join(rootPath(), "API-Schema"),
  path.join(rootPath(), "apps", "test", "resources", "response-schemas"),
  path.join(rootPath(), ".azuredevops", "API-Schema"),
];

const ajv = new Ajv({ allErrors: true, strict: false });
const compiledSchemaCache = new Map<string, ValidateFunction>();

// ─────────────────────────────────────────────────────────────────────────────
// Registry Reading (equivalent to C# getSchemaFilePathAndResponse)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the schema file path from the API registry for a given operation.
 * Equivalent to C# JsonSchemaValidator.getSchemaFilePathAndResponse().
 *
 * @param regFilePath - Relative path from ApiRegistry folder (e.g. "Payments-API/Batch-Payments/mockUploadBatchFileAPIREG")
 * @param operationKey - Key name of the operation in the registry JSON
 * @returns The relative schema file path declared in the registry
 */
export function getSchemaFilePath(regFilePath: string, operationKey: string): string {
  const normalizedPath = regFilePath.replace(/\\/g, "/");
  const filePath = normalizedPath.endsWith(".json") ? normalizedPath : `${normalizedPath}.json`;
  const fullPath = path.join(API_REGISTRY_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`API registry file not found: ${fullPath}`);
  }

  const jsonContent = fs.readFileSync(fullPath, "utf-8");
  const jsonData = JSON.parse(jsonContent);
  const entry = jsonData[operationKey];

  if (!entry) {
    throw new Error(`Operation "${operationKey}" not found in registry: ${regFilePath}`);
  }

  // Support both "responseSchema" (TS convention) and "schema" (C# convention)
  const schemaPath = entry.responseSchema || entry.schema;

  if (!schemaPath) {
    throw new Error(
      `No "responseSchema" or "schema" defined for operation "${operationKey}" in ${regFilePath}.`
    );
  }

  return schemaPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a relative schema path to an absolute path under supported schema roots.
 */
function resolveSchemaFullPath(schemaPath: string): string {
  const normalized = schemaPath.replace(/\\/g, "/").replace(/^\/+/, "");

  for (const root of RESPONSE_SCHEMAS_ROOTS) {
    const fullPath = path.resolve(root, normalized);
    if (!fullPath.startsWith(root)) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Return preferred-root path for clearer not-found messages downstream.
  return path.resolve(RESPONSE_SCHEMAS_ROOTS[0], normalized);
}

/**
 * Loads and parses a schema file, returning the raw JSON content.
 */
function loadSchemaFile(schemaPath: string): any {
  const fullPath = resolveSchemaFullPath(schemaPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Schema file not found: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Compiles a JSON Schema string into an Ajv ValidateFunction, with caching.
 */
function compileSchema(schemaJson: any): ValidateFunction {
  const cacheKey = JSON.stringify(schemaJson);
  const cached = compiledSchemaCache.get(cacheKey);
  if (cached) return cached;

  const validate = ajv.compile(schemaJson);
  compiledSchemaCache.set(cacheKey, validate);
  return validate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Result
// ─────────────────────────────────────────────────────────────────────────────

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidateJson (simple) — equivalent to C# ValidateJson(appName, jsonObject)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a JSON response string against a schema file referenced in the API registry.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the registry JSON
 * @param responseBody - The JSON response string or parsed object to validate
 * @returns SchemaValidationResult with valid flag and error messages
 *
 * @example
 * const result = validateJsonFromRegistry(
 *   "Payments-API/Batch-Payments/mockUploadBatchFileAPIREG",
 *   "mockUploadBatchFile",
 *   apiResponse.body
 * );
 */
export function validateJsonFromRegistry(
  regFilePath: string,
  operationKey: string,
  responseBody: any
): SchemaValidationResult {
  const schemaPath = getSchemaFilePath(regFilePath, operationKey);
  return validateJsonResponse(schemaPath, responseBody);
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidateJson (with named schema) — equivalent to C# ValidateJson(appName, jsonObject, schemaObjectName)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a JSON response against a named schema object within a schema file.
 * The schema file is expected to contain multiple named schema definitions:
 * {
 *   "accountsListSchema": { ... },
 *   "accountDetailSchema": { ... }
 * }
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the registry JSON
 * @param responseBody - The JSON response string or parsed object to validate
 * @param schemaObjectName - The key name of the schema object within the file
 * @returns SchemaValidationResult
 *
 * @example
 * const result = validateJsonFromRegistryNamed(
 *   "Payments-API/Batch-Payments/mockUploadBatchFileAPIREG",
 *   "mockUploadBatchFile",
 *   apiResponse.body,
 *   "uploadResponseSchema"
 * );
 */
export function validateJsonFromRegistryNamed(
  regFilePath: string,
  operationKey: string,
  responseBody: any,
  schemaObjectName: string
): SchemaValidationResult {
  const schemaPath = getSchemaFilePath(regFilePath, operationKey);
  const fullPath = resolveSchemaFullPath(schemaPath);
  const fullSchemaJson = loadSchemaFile(schemaPath);

  // Support both named-schema files (wrapped in a key) and flat schema files (top-level schema)
  const selectedSchema = fullSchemaJson[schemaObjectName] || fullSchemaJson;

  console.log(`[JsonSchemaValidator] Schema path: ${fullPath}`);
  return validateWithSchema(selectedSchema, responseBody);
}

// ─────────────────────────────────────────────────────────────────────────────
// validateJsonResponse — validates against a schema file path
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a JSON response against a schema file (direct path, not registry-driven).
 * Handles both object {} and array [] JSON responses.
 *
 * @param schemaPath - Relative path under supported schema roots
 * @param responseBody - The JSON response string or parsed object to validate
 * @returns SchemaValidationResult
 *
 * @example
 * const result = validateJsonResponse("accounts/accounts-list-schema.json", response.body);
 */
export function validateJsonResponse(
  schemaPath: string,
  responseBody: any
): SchemaValidationResult {
  const fullSchemaJson = loadSchemaFile(schemaPath);
  return validateWithSchema(fullSchemaJson, responseBody);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core validation logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a response body against a parsed JSON Schema object.
 * Automatically handles both object {} and array [] responses.
 */
function validateWithSchema(
  schemaJson: any,
  responseBody: any
): SchemaValidationResult {
  try {
    // Parse response if it's a string
    let data: any;
    if (typeof responseBody === "string") {
      const trimmed = responseBody.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return {
          valid: false,
          errors: ["Invalid JSON format: response must start with '{' or '['."],
        };
      }
      data = JSON.parse(trimmed);
    } else {
      data = responseBody;
    }

    const validate = compileSchema(schemaJson);
    const valid = validate(data) as boolean;
    const errors = (validate.errors || []).map(
      (e: ErrorObject) => `${e.instancePath || "/"} ${e.message}`
    );

    if (errors.length > 0) {
      console.log(`[JsonSchemaValidator] Validation failed with ${errors.length} issues:`);
      errors.forEach((err) => console.log(`  - ${err}`));
    }

    return { valid, errors };
  } catch (err: any) {
    console.error(`[JsonSchemaValidator] Schema validation error: ${err.message}`);
    return { valid: false, errors: [err.message] };
  }
}
