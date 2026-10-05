import * as fs from "fs";
import * as path from "path";
import { JSONPath } from "jsonpath-plus";
import { getApiBaseUrl, ApiServiceKey } from "../config/api-config";
import { getAppApiContext } from "../src/modules/shared/api/api-context-manager";
import ApiAuthProvider from "../src/modules/shared/api/api-auth-provider";
import { normalizeEnvironmentTier } from "./environment-handler";

/**
 * RestAPIHelper - TypeScript adaptation of the .NET RestSharp-based API execution layer.
 *
 * Provides a registry-driven approach to API testing:
 * - Reads endpoint configuration from ApiRegistry JSON files
 * - Resolves base URLs per environment via api-config.ts
 * - Supports path parameters, request body loading, and JSONPath extraction
 *
 * @author Shadab Anwar
 */

// Paths
const ROOT_DIR = path.resolve(__dirname, "../..");
const API_REGISTRY_DIR = path.join(ROOT_DIR, "ApiRegistry");
const BODY_DIR = path.join(ROOT_DIR, "Body");

function resolveCurrentEnv(): string {
  const rawEnv = String(
    process.env.ENVIROMENT_BASE_URL ||
    process.env.ENVIRONMENT_TIER ||
    process.env.ENVIRONMENT_BASE_URL ||
    process.env.TEST_ENV ||
    "STG"
  ).trim();
  return normalizeEnvironmentTier(rawEnv || "STG") || "STG";
}

// State for current request/response
let currentUrl: string = "";
let currentMethod: string = "";
let currentHeaders: Record<string, string> = {};
let lastResponseStatus: number = 0;
let lastResponseBody: any = null;
let lastResponseText: string = "";

// ─────────────────────────────────────────────────────────────────────────────
// Registry File Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the full path to an API registry JSON file.
 * @param regFilePath - Relative path from ApiRegistry folder (e.g. "Payments-API/Batch-Payments/mockUploadBatchFileAPIREG")
 * @returns Full path to the registry file
 */
export function getApiRegistryPath(regFilePath: string): string {
  // Normalize path separators and ensure .json extension
  const normalizedPath = regFilePath.replace(/\\/g, "/");
  const filePath = normalizedPath.endsWith(".json")
    ? normalizedPath
    : `${normalizedPath}.json`;

  const fullPath = path.join(API_REGISTRY_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`API registry file not found: ${fullPath}`);
  }

  return fullPath;
}

/**
 * Reads and parses an API registry JSON file.
 * @param regFilePath - Relative path from ApiRegistry folder
 * @returns Parsed JSON object
 */
export function readRegistryFile(regFilePath: string): any {
  const fullPath = getApiRegistryPath(regFilePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Gets a specific operation entry from the registry file.
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @returns The operation configuration object
 */
export function getRegistryEntry(regFilePath: string, operationKey: string): any {
  const registry = readRegistryFile(regFilePath);
  const entry = registry[operationKey];

  if (!entry) {
    throw new Error(
      `Operation "${operationKey}" not found in registry file: ${regFilePath}`
    );
  }

  return entry;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the full URL for an API request from registry configuration.
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @param pathParams - Optional path parameters to replace {param} placeholders
 * @returns The constructed URL
 */
export function setUrl(
  regFilePath: string,
  operationKey: string,
  pathParams?: Record<string, string>
): string {
  const entry = getRegistryEntry(regFilePath, operationKey);

  // Resolve base URL using api-config.ts
  const baseUrl = getApiBaseUrl(entry.baseUrl as ApiServiceKey);

  // Get endpoint and replace path parameters
  let endPoint: string = entry.endPoint;
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      endPoint = endPoint.replace(`{${key}}`, encodeURIComponent(value));
    }
  }

  currentUrl = `${baseUrl.replace(/\/+$/, "")}${endPoint}`;
  console.log(`[RestAPIHelper] URL: ${currentUrl}`);

  return currentUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configures the HTTP method and headers from registry.
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @returns The HTTP method (GET, POST, PUT, PATCH, DELETE)
 */
export function configureRequest(
  regFilePath: string,
  operationKey: string
): string {
  const entry = getRegistryEntry(regFilePath, operationKey);

  currentMethod = entry.requestMethod.toUpperCase();
  currentHeaders = entry.Headers || {};

  console.log(`[RestAPIHelper] Method: ${currentMethod}`);
  return currentMethod;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Body Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the request body file path from the registry.
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @param appName - Optional subfolder name under Body directory
 * @returns Full path to the request body file
 */
export function getRequestBodyPath(
  regFilePath: string,
  operationKey: string,
  appName?: string
): string {
  const entry = getRegistryEntry(regFilePath, operationKey);

  if (!entry.requestBody) {
    throw new Error(
      `No requestBody defined for operation "${operationKey}" in ${regFilePath}`
    );
  }

  const relativePath = String(entry.requestBody).replace(/\\/g, "/").replace(/^\/+/, "");
  const fullPath = appName
    ? path.join(BODY_DIR, appName, relativePath)
    : path.join(BODY_DIR, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Request body file not found: ${fullPath}`);
  }

  return fullPath;
}

/**
 * Reads the request body from file, with optional environment-specific support.
 * If the JSON contains environment keys (SIT, UAT, DEV), loads the current environment's body.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @param appName - Optional subfolder name under Body directory
 * @returns The request body as a string
 */
export function getRequestBody(
  regFilePath: string,
  operationKey: string,
  appName?: string
): string {
  const filePath = getRequestBodyPath(regFilePath, operationKey, appName);
  const content = fs.readFileSync(filePath, "utf-8");
  const jsonData = JSON.parse(content);
  const currentEnv = resolveCurrentEnv();

  // C# parity: if file has env sections, load current env block; otherwise load whole JSON.
  const hasEnvBlocks =
    Object.prototype.hasOwnProperty.call(jsonData, "SIT") ||
    Object.prototype.hasOwnProperty.call(jsonData, "UAT") ||
    Object.prototype.hasOwnProperty.call(jsonData, "DEV") ||
    Object.prototype.hasOwnProperty.call(jsonData, "STG") ||
    Object.prototype.hasOwnProperty.call(jsonData, "PROD");

  if (hasEnvBlocks) {
    const envBody = jsonData[currentEnv];
    if (envBody === undefined) {
      throw new Error(
        `Environment "${currentEnv}" not found in request body JSON file: ${filePath}`
      );
    }
    console.log(`[RestAPIHelper] Loaded environment-specific request body for: ${currentEnv}`);
    return JSON.stringify(envBody, null, 2);
  }

  console.log("[RestAPIHelper] Loaded generic request body (no environment-specific section).");
  return JSON.stringify(jsonData, null, 2);
}

/**
 * Reads request body and replaces ${param} placeholders with provided values.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @param replacements - Key-value pairs for placeholder replacement
 * @param appName - Optional subfolder name under Body directory
 * @returns The processed request body string
 */
export function getRequestBodyWithReplacements(
  regFilePath: string,
  operationKey: string,
  replacements: Record<string, string>,
  appName?: string
): string {
  let requestBody = getRequestBody(regFilePath, operationKey, appName);

  // Replace ${key} placeholders literally to avoid regex replacement edge-cases.
  for (const [key, value] of Object.entries(replacements)) {
    const token = `\${${key}}`;
    requestBody = requestBody.split(token).join(String(value));
  }

  return requestBody;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Execution
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse {
  status: number;
  body: any;
  text: string;
  headers: Record<string, string>;
}

/**
 * Executes an API request based on registry configuration.
 *
 * @param regFilePath - Relative path from ApiRegistry folder (e.g. "Payments-API/Batch-Payments/mockUploadBatchFileAPIREG")
 * @param operationKey - Key name of the operation in the JSON (e.g. "mockUploadBatchFile")
 * @param options - Optional request configuration
 * @returns ApiResponse with status, body, and extracted values
 */
export async function executeApiRequest(
  regFilePath: string,
  operationKey: string,
  options: {
    pathParams?: Record<string, string>;
    bodyReplacements?: Record<string, string>;
    queryParams?: Record<string, string | number | boolean>;
    additionalHeaders?: Record<string, string>;
    appName?: string;
  } = {}
): Promise<ApiResponse> {
  const entry = getRegistryEntry(regFilePath, operationKey);

  // Set URL with path parameters
  const url = setUrl(regFilePath, operationKey, options.pathParams);

  // Configure request method and headers
  configureRequest(regFilePath, operationKey);

  // Get API context and auth headers
  const apiContext = await getAppApiContext();
  const apiBaseUrl = getApiBaseUrl(entry.baseUrl as ApiServiceKey);
  const authHeaders = await ApiAuthProvider.getAuthHeaders(apiContext, apiBaseUrl);

  // Merge headers: registry + auth + additional
  const headers: Record<string, string> = {
    ...currentHeaders,
    ...authHeaders,
    ...options.additionalHeaders,
  };

  // Prepare request body for non-GET/DELETE methods
  let data: any = undefined;
  if (currentMethod !== "GET" && currentMethod !== "DELETE") {
    if (entry.requestBody) {
      const rawBody = options.bodyReplacements
        ? getRequestBodyWithReplacements(
          regFilePath,
          operationKey,
          options.bodyReplacements,
          options.appName
        )
        : getRequestBody(regFilePath, operationKey, options.appName);

      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }
    }
  }

  // Execute request based on method
  let response: any;
  const requestConfig: any = { headers };

  if (options.queryParams) {
    requestConfig.params = options.queryParams;
  }

  console.log(`[RestAPIHelper] Executing ${currentMethod} ${url}`);
  const maskedHeaders = { ...headers };
  if (maskedHeaders.Authorization) {
    maskedHeaders.Authorization = maskedHeaders.Authorization.substring(0, 20) + "...<redacted>";
  }
  console.log(`[RestAPIHelper] Headers: ${JSON.stringify(maskedHeaders, null, 2)}`);
  if (data !== undefined) {
    const dataPreview = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    console.log(`[RestAPIHelper] Request Body (first 1000 chars): ${dataPreview.substring(0, 1000)}`);
    if (dataPreview.length > 1000) {
      console.log(`[RestAPIHelper] ... (${dataPreview.length} total chars)`);
    }
  } else {
    console.log(`[RestAPIHelper] Request Body: undefined (no body sent)`);
  }

  switch (currentMethod) {
    case "GET":
      response = await apiContext.get(url, requestConfig);
      break;
    case "POST":
      response = await apiContext.post(url, { ...requestConfig, data });
      break;
    case "PUT":
      response = await apiContext.put(url, { ...requestConfig, data });
      break;
    case "PATCH":
      response = await apiContext.patch(url, { ...requestConfig, data });
      break;
    case "DELETE":
      response = await apiContext.delete(url, requestConfig);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${currentMethod}`);
  }

  // Store response state
  lastResponseStatus = response.status();
  lastResponseText = await response.text();

  try {
    lastResponseBody = JSON.parse(lastResponseText);
  } catch {
    lastResponseBody = lastResponseText;
  }

  const responseHeaders: Record<string, string> = response.headers();

  console.log(`[RestAPIHelper] Response Status: ${lastResponseStatus}`);

  return {
    status: lastResponseStatus,
    body: lastResponseBody,
    text: lastResponseText,
    headers: responseHeaders,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// JSONPath Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a single value from the last response using a JSONPath expression.
 *
 * @param jsonPath - JSONPath expression (e.g. "$.data[0].id")
 * @param responseBody - Optional response body (uses last response if not provided)
 * @returns The extracted value as a string, or empty string if not found
 */
export function getValueByJsonPath(
  jsonPath: string,
  responseBody?: any
): string {
  const body = responseBody || lastResponseBody;

  if (!body) {
    throw new Error("No response body available. Execute a request first.");
  }

  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const parsedBody = typeof body === "string" ? JSON.parse(body) : body;

  const results = JSONPath({ path: jsonPath, json: parsedBody });

  if (results.length === 0) {
    console.log(`[RestAPIHelper] No value found for JSONPath: ${jsonPath}`);
    return "";
  }

  const value = results[0];
  console.log(`[RestAPIHelper] JSONPath ${jsonPath} => ${value}`);
  return String(value);
}

/**
 * Extracts a value from the last response using a named jpath from the registry.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @param jpathKey - Key name in the "jpaths" object of the registry
 * @param responseBody - Optional response body (uses last response if not provided)
 * @returns The extracted value
 */
export function getJPathValue(
  regFilePath: string,
  operationKey: string,
  jpathKey: string,
  responseBody?: any
): string {
  const entry = getRegistryEntry(regFilePath, operationKey);

  if (!entry.jpaths || !entry.jpaths[jpathKey]) {
    throw new Error(
      `No jpath "${jpathKey}" defined for operation "${operationKey}" in ${regFilePath}`
    );
  }

  const jsonPath = entry.jpaths[jpathKey];
  return getValueByJsonPath(jsonPath, responseBody);
}

/**
 * Extracts multiple values from the last response using a JSONPath expression.
 *
 * @param jsonPath - JSONPath expression that matches multiple nodes
 * @param responseBody - Optional response body (uses last response if not provided)
 * @returns Array of extracted values as strings
 */
export function getMultipleValuesByJsonPath(
  jsonPath: string,
  responseBody?: any
): string[] {
  const body = responseBody || lastResponseBody;

  if (!body) {
    throw new Error("No response body available. Execute a request first.");
  }

  const parsedBody = typeof body === "string" ? JSON.parse(body) : body;
  const results = JSONPath({ path: jsonPath, json: parsedBody });

  const values = results.map((v: any) => String(v));
  console.log(`[RestAPIHelper] JSONPath ${jsonPath} => ${values.length} values`);

  return values;
}

/**
 * Extracts multiple values using a named jpath from the registry.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation in the JSON
 * @param jpathKey - Key name in the "jpaths" object of the registry
 * @param responseBody - Optional response body (uses last response if not provided)
 * @returns Array of extracted values as strings
 */
export function getMultipleJPathValues(
  regFilePath: string,
  operationKey: string,
  jpathKey: string,
  responseBody?: any
): string[] {
  const entry = getRegistryEntry(regFilePath, operationKey);

  if (!entry.jpaths || !entry.jpaths[jpathKey]) {
    throw new Error(
      `No jpath "${jpathKey}" defined for operation "${operationKey}" in ${regFilePath}`
    );
  }

  const jsonPath = entry.jpaths[jpathKey];
  return getMultipleValuesByJsonPath(jsonPath, responseBody);
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry Attribute Access
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets an attribute value directly from the registry file.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation
 * @param attribute - Attribute name (e.g. "endPoint", "requestMethod")
 * @returns The attribute value as a string
 */
export function getRegistryAttribute(
  regFilePath: string,
  operationKey: string,
  attribute: string
): string {
  const entry = getRegistryEntry(regFilePath, operationKey);
  const value = entry[attribute];

  if (value === undefined) {
    throw new Error(
      `Attribute "${attribute}" not found for operation "${operationKey}" in ${regFilePath}`
    );
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Gets a nested attribute value from the registry file.
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation
 * @param attribute - Parent attribute name
 * @param subAttribute - Nested attribute name
 * @returns The nested attribute value as a string
 */
export function getRegistryNestedAttribute(
  regFilePath: string,
  operationKey: string,
  attribute: string,
  subAttribute: string
): string {
  const entry = getRegistryEntry(regFilePath, operationKey);
  const parentValue = entry[attribute];

  if (!parentValue || typeof parentValue !== "object") {
    throw new Error(
      `Attribute "${attribute}" is not an object for operation "${operationKey}" in ${regFilePath}`
    );
  }

  const value = parentValue[subAttribute];
  if (value === undefined) {
    throw new Error(
      `Sub-attribute "${subAttribute}" not found under "${attribute}" for operation "${operationKey}"`
    );
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Methods (similar to C# RestAPIHelper)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * High-level method: Configures and executes an API request in one call.
 * Equivalent to C# RestAPIHelper.APIRequest() + APIResponse().
 *
 * @param regFilePath - Relative path from ApiRegistry folder
 * @param operationKey - Key name of the operation
 * @param options - Optional request configuration
 * @returns ApiResponse
 */
export async function apiRequest(
  regFilePath: string,
  operationKey: string,
  options: {
    pathParams?: Record<string, string>;
    bodyReplacements?: Record<string, string>;
    queryParams?: Record<string, string | number | boolean>;
    additionalHeaders?: Record<string, string>;
    appName?: string;
  } = {}
): Promise<ApiResponse> {
  return executeApiRequest(regFilePath, operationKey, options);
}

/**
 * Gets the last response status code.
 */
export function getLastResponseStatus(): number {
  return lastResponseStatus;
}

/**
 * Gets the last response body.
 */
export function getLastResponseBody(): any {
  return lastResponseBody;
}

/**
 * Gets the last response as raw text.
 */
export function getLastResponseText(): string {
  return lastResponseText;
}

/**
 * Generates a random alphanumeric string.
 * @param length - Length of the string
 * @returns Random string
 */
export function getRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random numeric string.
 * @param length - Length of the string
 * @returns Random numeric string
 */
export function getRandomNumericString(length: number): string {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
