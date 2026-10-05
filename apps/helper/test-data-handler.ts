import { getEnvironmentTier } from "./environment-handler";
import * as fs from "fs";
import * as path from "path";
import { rootPath } from "./root-path";

/**
 * TestDataHandler - TypeScript equivalent of C# APIAutomationFramework.Utilities.TestDataHandler.
 *
 * Loads environment-specific test data from:
 *   <projectRoot>/apps/test/data/environ/<ENV>/<module>/<fileName>.json
 *
 * The environment (STG / TST) is resolved automatically from
 * process.env.ENVIROMENT_BASE_URL so the same step code works
 * across environments — just add/update the JSON file under the
 * matching environment folder.
 *
 * @author Shadab Anwar
 */

// ─────────────────────────────────────────────────────────────────────────────
// Environment Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the current environment tier (e.g. "STG", "TST").
 * Mirrors the C# EnvironmentHandler.getTierValue().
 */
function getTierValue(): string {
  const env = getEnvironmentTier();
  if (!env || env === "undefined") {
    throw new Error(
      "[TestDataHandler] No environment tier is resolved. " +
      "Set ENVIRONMENT_TIER, ENVIROMENT_BASE_URL, or tier in config.ini."
    );
  }
  return env;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(rootPath(), "apps", "test", "data", "environ");

/**
 * Resolves the full path to a test data JSON file.
 *
 * Supports two layouts:
 *   1. Module-based: apps/test/data/environ/{env}/{module}/{fileName}.json
 *   2. Flat:         apps/test/data/environ/{env}/{fileName}.json
 *
 * Module-based path is tried first; falls back to flat for backward compatibility.
 *
 * @param module    Sub-folder under the environment folder (e.g. "Payments", "Accounts")
 * @param fileName  JSON file name without extension (e.g. "batch-payment-test-data")
 * @returns Absolute path to the JSON file
 */
function resolveFilePath(module: string, fileName: string): string {
  const env = getTierValue();

  // 1. Try module-based path: environ/{env}/{module}/{fileName}.json
  const modulePath = path.join(DATA_ROOT, env, module, `${fileName}.json`);
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }

  // 2. Fallback to flat path: environ/{env}/{fileName}.json
  const flatPath = path.join(DATA_ROOT, env, `${fileName}.json`);
  if (fs.existsSync(flatPath)) {
    return flatPath;
  }

  throw new Error(
    `[TestDataHandler] Test data file not found:\n` +
    `  Environment : ${env}\n` +
    `  Module      : ${module}\n` +
    `  FileName    : ${fileName}.json\n` +
    `  Tried (1)   : ${modulePath}\n` +
    `  Tried (2)   : ${flatPath}\n\n` +
    `Add the file at either:\n` +
    `  apps/test/data/environ/${env}/${module}/${fileName}.json  (module-based)\n` +
    `  apps/test/data/environ/${env}/${fileName}.json            (flat)`
  );
}

/**
 * Reads and parses a test data JSON file.
 */
function readJsonFile(module: string, fileName: string): any {
  const filePath = resolveFilePath(module, fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single attribute value from a named object in the test data file.
 *
 * JSON structure:
 * ```json
 * {
 *   "ObjectName": {
 *     "attribute": "value"
 *   }
 * }
 * ```
 *
 * @param module    Module sub-folder (e.g. "Payments")
 * @param fileName  File name without .json (e.g. "batch-payment-test-data")
 * @param object    Top-level key in the JSON (e.g. "debitAccount")
 * @param attribute Key under that object (e.g. "value") — pass "" if object IS the value
 * @returns The attribute value as a string
 *
 * @example
 * // For { "config": { "companyId": "1805" } }
 * testFileHandler("Payments", "batch-payment-test-data", "config", "companyId")
 * // => "1805"
 *
 * @example
 * // For { "debitAccount": "1300307803582" }
 * testFileHandler("Payments", "batch-payment-test-data", "debitAccount", "")
 * // => "1300307803582"
 */
export function testFileHandler(
  module: string,
  fileName: string,
  object: string,
  attribute: string
): string {
  const json = readJsonFile(module, fileName);

  let value: any;
  if (attribute === "" || attribute === undefined || attribute === null) {
    value = json[object];
  } else {
    value = json[object]?.[attribute];
  }

  if (value === undefined || value === null) {
    throw new Error(
      `[TestDataHandler] Attribute not found:\n` +
      `  Module    : ${module}\n` +
      `  File      : ${fileName}.json\n` +
      `  Object    : ${object}\n` +
      `  Attribute : ${attribute || "(root)"}\n\n` +
      `Available keys: ${Object.keys(json).join(", ")}`
    );
  }

  const result = typeof value === "string" ? value : JSON.stringify(value);
  console.log(`[TestDataHandler] ${object}.${attribute || "(root)"} = ${result}`);
  return result;
}

/**
 * Returns a single attribute value from an array element at the given index.
 *
 * JSON structure:
 * ```json
 * {
 *   "transactions": [
 *     { "amount": 50, "ref": "abc" },
 *     { "amount": 20, "ref": "def" }
 *   ]
 * }
 * ```
 *
 * @param module    Module sub-folder
 * @param fileName  File name without .json
 * @param object    Key holding the array (e.g. "transactions")
 * @param attribute Key inside the array item (e.g. "amount")
 * @param index     Array index (0-based)
 * @returns The attribute value as a string
 *
 * @example
 * testListFileHandler("Payments", "batch-payment-test-data", "transactions", "amount", 0)
 * // => "50"
 */
export function testListFileHandler(
  module: string,
  fileName: string,
  object: string,
  attribute: string,
  index: number
): string {
  const json = readJsonFile(module, fileName);
  const arr = json[object];

  if (!Array.isArray(arr)) {
    throw new Error(
      `[TestDataHandler] "${object}" is not an array in ${fileName}.json`
    );
  }

  if (index < 0 || index >= arr.length) {
    throw new Error(
      `[TestDataHandler] Index ${index} out of bounds for "${object}" (length: ${arr.length})`
    );
  }

  const value = arr[index]?.[attribute];
  if (value === undefined || value === null) {
    throw new Error(
      `[TestDataHandler] Attribute "${attribute}" not found at ${object}[${index}]`
    );
  }

  const result = typeof value === "string" ? value : JSON.stringify(value);
  console.log(`[TestDataHandler] ${object}[${index}].${attribute} = ${result}`);
  return result;
}

/**
 * Returns ALL values of an attribute from an array as a string list.
 *
 * JSON structure:
 * ```json
 * {
 *   "transactions": [
 *     { "creditAccountId": "101355" },
 *     { "creditAccountId": "202466" }
 *   ]
 * }
 * ```
 *
 * @param module    Module sub-folder
 * @param fileName  File name without .json
 * @param object    Key holding the array
 * @param attribute Key inside each array item
 * @returns Array of string values
 *
 * @example
 * testListFileHandler("Payments", "batch-payment-test-data", "transactions", "creditAccountId")
 * // => ["101355", "202466"]
 */
export function testListAllHandler(
  module: string,
  fileName: string,
  object: string,
  attribute: string
): string[] {
  const json = readJsonFile(module, fileName);
  const arr = json[object];

  if (!Array.isArray(arr)) {
    throw new Error(
      `[TestDataHandler] "${object}" is not an array in ${fileName}.json`
    );
  }

  const values = arr
    .map((item) => item[attribute])
    .filter((v) => v !== undefined && v !== null)
    .map((v) => (typeof v === "string" ? v : JSON.stringify(v)));

  console.log(
    `[TestDataHandler] ${object}[*].${attribute} = [${values.join(", ")}]`
  );
  return values;
}

/**
 * Returns the entire JSON file content as a parsed object.
 *
 * @param module   Module sub-folder
 * @param fileName File name without .json
 * @returns Parsed JSON object
 *
 * @example
 * const data = testJsonFileHandler("Payments", "batch-payment-test-data");
 * console.log(data.companyId); // "1805"
 */
export function testJsonFileHandler(module: string, fileName: string): any {
  const json = readJsonFile(module, fileName);
  console.log(`[TestDataHandler] Loaded ${fileName}.json (${Object.keys(json).length} keys)`);
  return json;
}

/**
 * Returns the raw JSON string content of the file.
 *
 * @param module   Module sub-folder
 * @param fileName File name without .json
 * @returns Raw JSON string
 *
 * @example
 * const raw = testRawJsonFileHandler("Payments", "batch-payment-test-data");
 * // Use for sending as request body
 */
export function testRawJsonFileHandler(module: string, fileName: string): string {
  const filePath = resolveFilePath(module, fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  console.log(`[TestDataHandler] Loaded raw ${fileName}.json (${content.length} bytes)`);
  return content;
}
