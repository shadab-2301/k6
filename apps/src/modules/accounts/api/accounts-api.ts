import BaseApiClient from "../../shared/api/base-api-client";
import { IAccountsList } from "../types/i-account-list-interface";
import { SchemaValidationResult } from "../../shared/api/schema-validator";

/**
 * API "page object" for the Accounts module - reference implementation showing
 * how API automation plugs into the existing UI POM structure. Mirrors
 * apps/src/modules/accounts/pages (UI POM), but talks directly to the backend
 * instead of driving the browser, and reuses the same response types
 * (apps/src/modules/accounts/types) as the UI layer.
 *
 * The endpoint, method, headers, response schema and JSONPath extractors for
 * "getAccountsList" are all defined centrally in
 * apps/src/modules/shared/api/api-registry.json - this class just invokes that
 * operation by name.
 *
 * Add further operations to the registry + a matching method here as real API
 * coverage is built out.
 */
export default class AccountsApi {
  static async getAccountsList(queryParams?: Record<string, string | number>): Promise<{
    status: number;
    body: IAccountsList;
    extract: (jpathKey: string) => any;
    validateSchema: () => SchemaValidationResult;
  }> {
    return BaseApiClient.callByRegistry<IAccountsList>("getAccountsList", { queryParams });
  }
}


