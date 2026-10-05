import { TokenGenerator } from "../../../../helper/token-generator";

/**
 * Provides auth headers for API calls by delegating to TokenGenerator.
 *
 * TokenGenerator handles the two-step flow:
 * 1. ADO token via client_credentials grant (Microsoft login)
 * 2. App bearer token via ADO token + user info from Tokens.json
 *
 * Caching is handled inside TokenGenerator itself.
 */
export default class ApiAuthProvider {
  /**
   * Returns Authorization headers for API requests.
   *
   * @param _apiContext - Unused, kept for backward compatibility with callers
   * @param _baseUrl - Unused, kept for backward compatibility with callers
   * @param tokenKey - Key under the current environment in Tokens.json (e.g. "BEW_USER").
   *   Falls back to API_TOKEN_KEY env var, then to first available key.
   */
  static async getAuthHeaders(
    _apiContext?: any,
    _baseUrl?: string,
    tokenKey?: string
  ): Promise<Record<string, string>> {
    const resolvedKey = tokenKey || process.env.API_TOKEN_KEY || "";
    return TokenGenerator.getAuthHeaders(resolvedKey);
  }

  /** Forces the next request to re-authenticate, e.g. after a 401/403. */
  static reset() {
    TokenGenerator.reset();
  }
}
