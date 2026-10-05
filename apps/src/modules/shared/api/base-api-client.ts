import * as fs from "fs";
import * as path from "path";
import { getAppApiContext } from "./api-context-manager";
import ApiAuthProvider from "./api-auth-provider";
import { getApiBaseUrl, ApiServiceKey } from "../../../../config/api-config";
import { extractJsonPath } from "./json-path";
import { validateAgainstSchema, SchemaValidationResult } from "./schema-validator";
import { ApiRegistry, ApiRegistryEntry, HttpMethod } from "./api-registry.types";

const REGISTRY_PATH = path.join(__dirname, "api-registry.json");
const REQUEST_BODIES_ROOT = path.resolve(__dirname, "../../../../test/resources/request-bodies");

let registryCache: ApiRegistry | null = null;

function loadRegistry(): ApiRegistry {
  if (!registryCache) {
    registryCache = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  }
  return registryCache!;
}

function getRegistryEntry(operationKey: string): ApiRegistryEntry {
  const entry = loadRegistry()[operationKey];
  if (!entry) {
    throw new Error(`No API registry entry found for operation "${operationKey}". Add it to api-registry.json.`);
  }
  return entry;
}

/** Replaces {pathParam} placeholders in an endpoint template, e.g. "/x/{id}" + { id: 1 } -> "/x/1". */
function resolveEndpoint(endPoint: string, pathParams?: Record<string, string | number>): string {
  return endPoint.replace(/\{(\w+)\}/g, (match, key) => {
    if (!pathParams || !(key in pathParams)) {
      throw new Error(`Missing path param "${key}" for endpoint "${endPoint}".`);
    }
    return encodeURIComponent(String(pathParams[key]));
  });
}

/** Loads a request-body fixture referenced by a registry entry's "requestBody" path. */
function loadRequestBodyFixture(requestBodyPath?: string | null): any {
  if (!requestBodyPath) return undefined;

  const normalized = requestBodyPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const fullPath = path.resolve(REQUEST_BODIES_ROOT, normalized);

  if (!fullPath.startsWith(REQUEST_BODIES_ROOT)) {
    throw new Error(`Request body path "${requestBodyPath}" resolves outside of ${REQUEST_BODIES_ROOT}.`);
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

export interface RegistryCallOptions {
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string | number | boolean>;
  /** Merged over (and can override individual fields of) the JSON loaded from "requestBody". */
  bodyOverrides?: Record<string, any>;
  /** Merged over (and can override) the registry's static "Headers" + the auth header. */
  headers?: Record<string, string>;
}

export interface RegistryCallResult<T = any> {
  status: number;
  body: T;
  /** Reads a named JSONPath declared in the operation's "jpaths", e.g. extract('totalCount'). */
  extract: (jpathKey: string) => any;
  /** Validates the response body against the operation's "responseSchema" JSON Schema fixture. */
  validateSchema: () => SchemaValidationResult;
}

/**
 * Generic API POM helper: wraps the app's Playwright APIRequestContext with
 * auth-header injection and consistent error logging, so per-module API
 * classes (e.g. modules/accounts/api/accounts-api.ts) only call get/post/patch/put/delete,
 * or drive everything from the central registry via callByRegistry().
 */
export default class BaseApiClient {
  /**
   * Executes a call fully described by a single api-registry.json entry:
   * base URL (per service+env), endpoint (with path params), method, headers,
   * request body fixture, and named JSONPath extractors for the response.
   */
  static async callByRegistry<T = any>(
    operationKey: string,
    options: RegistryCallOptions = {}
  ): Promise<RegistryCallResult<T>> {
    const entry = getRegistryEntry(operationKey);
    const apiContext = await getAppApiContext();

    const baseUrl = getApiBaseUrl(entry.baseUrl as ApiServiceKey);
    const endpoint = resolveEndpoint(entry.endPoint, options.pathParams);
    const url = `${baseUrl.replace(/\/+$/, "")}${endpoint}`;

    const authHeaders = await ApiAuthProvider.getAuthHeaders(apiContext, baseUrl);
    const headers = { ...(entry.Headers || {}), ...authHeaders, ...(options.headers || {}) };

    let data: any;
    if (entry.requestMethod !== "GET" && entry.requestMethod !== "DELETE") {
      const fixture = loadRequestBodyFixture(entry.requestBody);
      data = fixture || options.bodyOverrides ? { ...(fixture || {}), ...(options.bodyOverrides || {}) } : undefined;
    }

    const requestByMethod: Record<HttpMethod, () => Promise<any>> = {
      GET: () => apiContext.get(url, { headers, params: options.queryParams }),
      POST: () => apiContext.post(url, { headers, params: options.queryParams, data }),
      PUT: () => apiContext.put(url, { headers, params: options.queryParams, data }),
      PATCH: () => apiContext.patch(url, { headers, params: options.queryParams, data }),
      DELETE: () => apiContext.delete(url, { headers, params: options.queryParams }),
    };

    const response = await requestByMethod[entry.requestMethod]();
    await this.checkForErrors(response, entry.requestMethod, url);

    let body: any;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      status: response.status(),
      body,
      extract: (jpathKey: string) => {
        const jpath = entry.jpaths?.[jpathKey];
        if (!jpath) {
          throw new Error(`No jpath "${jpathKey}" defined for operation "${operationKey}" in api-registry.json.`);
        }
        return extractJsonPath(body, jpath);
      },
      validateSchema: () => {
        if (!entry.responseSchema) {
          throw new Error(`No responseSchema defined for operation "${operationKey}" in api-registry.json.`);
        }
        return validateAgainstSchema(entry.responseSchema, body);
      },
    };
  }

  static async get(endpoint: string, params?: Record<string, string | number | boolean>) {
    const apiContext = await getAppApiContext();
    const headers = await ApiAuthProvider.getAuthHeaders(apiContext);
    const response = await apiContext.get(endpoint, { headers, params });
    await this.checkForErrors(response, "GET", endpoint);
    return response;
  }

  static async post(endpoint: string, data?: any) {
    const apiContext = await getAppApiContext();
    const headers = await ApiAuthProvider.getAuthHeaders(apiContext);
    const response = await apiContext.post(endpoint, { headers, data });
    await this.checkForErrors(response, "POST", endpoint);
    return response;
  }

  static async put(endpoint: string, data?: any) {
    const apiContext = await getAppApiContext();
    const headers = await ApiAuthProvider.getAuthHeaders(apiContext);
    const response = await apiContext.put(endpoint, { headers, data });
    await this.checkForErrors(response, "PUT", endpoint);
    return response;
  }

  static async patch(endpoint: string, data?: any) {
    const apiContext = await getAppApiContext();
    const headers = await ApiAuthProvider.getAuthHeaders(apiContext);
    const response = await apiContext.patch(endpoint, { headers, data });
    await this.checkForErrors(response, "PATCH", endpoint);
    return response;
  }

  static async delete(endpoint: string) {
    const apiContext = await getAppApiContext();
    const headers = await ApiAuthProvider.getAuthHeaders(apiContext);
    const response = await apiContext.delete(endpoint, { headers });
    await this.checkForErrors(response, "DELETE", endpoint);
    return response;
  }

  private static async checkForErrors(response: any, method: string, endpoint: string) {
    if (response.status() === 401 || response.status() === 403) {
      const body = await response.text();
      console.error(
        `\n[API AUTH ERROR] ${method} ${endpoint} failed with status ${response.status()}. Possible expired/invalid API token.\nResponse: ${body}\n`
      );
      ApiAuthProvider.reset();
    } else if (!response.ok()) {
      const body = await response.text();
      console.error(`\n[API ERROR] ${method} ${endpoint} failed with status ${response.status()}.\nResponse: ${body}\n`);
    }
  }
}
