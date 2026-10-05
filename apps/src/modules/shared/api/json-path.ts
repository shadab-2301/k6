import { JSONPath } from "jsonpath-plus";

/**
 * Thin wrapper around jsonpath-plus used to resolve the "jpaths" declared per
 * operation in api-registry.json against a response body.
 * `eval: false` disables script/filter expressions so jpaths can never
 * execute arbitrary code, even though the registry is trusted, static config.
 * (jsonpath-plus v10 renamed the old `preventEval: true` option to `eval: false`.)
 */
export function extractJsonPath(data: any, jsonPath: string): any {
  const results = JSONPath({ path: jsonPath, json: data, eval: false, wrap: false });
  return results;
}
