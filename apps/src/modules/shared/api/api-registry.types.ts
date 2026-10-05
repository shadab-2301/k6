export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * A single entry in api-registry.json - the one place that describes how to call
 * a given backend operation: which service/host it lives on, the endpoint template
 * (supports {pathParam} placeholders), the HTTP verb, an optional request body
 * fixture file, static headers, and named JSONPath extractors for its response.
 */
export interface ApiRegistryEntry {
  /** Logical service name, resolved to a real host per environment via apps/config/api-config.ts */
  baseUrl: string;
  /** Endpoint path, e.g. "/proxies-service/api/v1/{approveType}/{transId}" */
  endPoint: string;
  requestMethod: HttpMethod;
  /** Path (relative to apps/test/resources/request-bodies) to a JSON payload fixture, or null/omitted for bodyless requests */
  requestBody?: string | null;
  /** Path (relative to .azuredevops/API-Schema) to a JSON Schema fixture used for response validation */
  responseSchema?: string | null;
  /** Static headers merged with the auth header on every call */
  Headers?: Record<string, string>;
  /** Named JSONPath expressions for pulling values out of the response body */
  jpaths?: Record<string, string>;
}

export type ApiRegistry = Record<string, ApiRegistryEntry>;
