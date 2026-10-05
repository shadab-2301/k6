import * as fs from "fs";
import * as path from "path";
import { JSONPath } from "jsonpath-plus";
import { getAppApiContext } from "../src/modules/shared/api/api-context-manager";
import { getCurrentApiEnv, getApiBaseUrl } from "../config/api-config";

/**
 * TokenGenerator - TypeScript port of C# APIAutomationFramework.Utilities.TokenGenarator.
 *
 * Two-step token generation flow:
 * 1. ADO Token: client_credentials grant → Microsoft login endpoint → access_token
 * 2. App Bearer Token: ADO token + user info from Tokens.json → BAPI token endpoint → jwt
 *
 * Both tokens are cached and auto-refreshed before expiry.
 *
 * @author Shadab Anwar
 */

const ROOT_DIR = path.resolve(__dirname, "../..");
const API_REGISTRY_DIR = path.join(ROOT_DIR, "ApiRegistry");

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface ResolvedConfigValue {
  value?: string;
  source: string;
}

interface AdoTokenConfig {
  grantType: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export class TokenGenerator {
  private static adoTokenCache: CachedToken | null = null;
  private static appTokenCache: CachedToken | null = null;
  private static pendingAdoToken: Promise<string> | null = null;
  private static pendingAppToken: Promise<string> | null = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // File Reading
  // ─────────────────────────────────────────────────────────────────────────────

  private static readJsonFile(relativePath: string): any {
    const fullPath = path.join(API_REGISTRY_DIR, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[TokenGenerator] File not found: ${fullPath}`);
    }
    return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  }

  private static getCurrentEnv(): string {
    return getCurrentApiEnv();
  }

  private static readEnvValue(...envKeys: string[]): ResolvedConfigValue {
    for (const envKey of envKeys) {
      const value = (process.env[envKey] || "").trim();
      if (value && value !== "undefined") {
        return { value, source: `env:${envKey}` };
      }
    }

    return { source: "env" };
  }

  private static resolveConfigValue(fileValue: unknown, ...envKeys: string[]): ResolvedConfigValue {
    const envValue = this.readEnvValue(...envKeys);
    if (envValue.value) {
      return envValue;
    }

    const fallbackValue = typeof fileValue === "string" ? fileValue.trim() : "";
    if (fallbackValue) {
      return { value: fallbackValue, source: "file:ApiRegistry/adoTokenClient.json" };
    }

    return { source: "missing" };
  }

  private static resolveAdoTokenConfig(clientData: Record<string, unknown>): AdoTokenConfig {
    const grantType = this.resolveConfigValue(clientData.adoGrant_type, "adoGrantType", "adoGrant_type");
    const clientId = this.resolveConfigValue(clientData.adoClient_id, "adoClientId", "adoClient_id");
    const clientSecret = this.resolveConfigValue(clientData.adoClient_secret, "adoClientSecret", "adoClient_secret");
    const scope = this.resolveConfigValue(clientData.adoScope, "adoScope");

    const missing: string[] = [];

    if (!grantType.value) missing.push("adoGrantType (or adoGrant_type)");
    if (!clientId.value) missing.push("adoClientId (or adoClient_id)");
    if (!clientSecret.value) missing.push("adoClientSecret (or adoClient_secret)");
    if (!scope.value) missing.push("adoScope");

    if (missing.length > 0) {
      throw new Error(
        `[TokenGenerator] Missing ADO token config value(s): ${missing.join(", ")}. ` +
        `Provide them as environment variables for pipeline runs or define them in ApiRegistry/adoTokenClient.json for local runs.`
      );
    }

    console.log(
      `[TokenGenerator] ADO config sources: grantType=${grantType.source}, clientId=${clientId.source}, clientSecret=${clientSecret.source}, scope=${scope.source}`
    );

    return {
      grantType: grantType.value!,
      clientId: clientId.value!,
      clientSecret: clientSecret.value!,
      scope: scope.value!,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: ADO Token (client_credentials)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generates an Azure AD v2 OAuth2 token using client_credentials grant.
   * Corresponds to C# TokenGenarator.GenerateV2_AuthToken().
   *
   * Reads client credentials from `ApiRegistry/adoTokenClient.json`
    * and lets environment variables override file values for pipeline runs.
    * Supported env vars: adoClientId/adoClient_id, adoClientSecret/adoClient_secret,
    * adoScope, adoGrantType/adoGrant_type.
   * Calls the endpoint defined in `ApiRegistry/adoTokenV2APIReg.json`.
   *
   * @returns The ADO access_token
   */
  static async generateAdoToken(): Promise<string> {
    if (this.adoTokenCache && this.adoTokenCache.expiresAt > Date.now()) {
      return this.adoTokenCache.token;
    }

    if (!this.pendingAdoToken) {
      this.pendingAdoToken = this.fetchAdoToken().finally(() => {
        this.pendingAdoToken = null;
      });
    }
    return this.pendingAdoToken;
  }

  private static async fetchAdoToken(): Promise<string> {
    const clientData = this.readJsonFile("adoTokenClient.json");
    const regData = this.readJsonFile("adoTokenV2APIReg.json");
    const regEntry = regData["getAdoTokenV2"];
    const adoConfig = this.resolveAdoTokenConfig(clientData);

    const url = `${regEntry.baseUrl}${regEntry.endPoint}`;
    console.log(`[TokenGenerator] Requesting ADO token from: ${url}`);

    const apiContext = await getAppApiContext();
    const params = new URLSearchParams();
    params.append("grant_type", adoConfig.grantType);
    params.append("client_id", adoConfig.clientId);
    params.append("client_secret", adoConfig.clientSecret);
    params.append("scope", adoConfig.scope);

    const response = await apiContext.post(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: params.toString(),
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `[TokenGenerator] ADO token request failed with status ${response.status()}.\nResponse: ${body}`
      );
    }

    const body = await response.json();
    const jpath = regEntry.jpaths?.adoAccessToken || "$.access_token";
    const results = JSONPath({ path: jpath, json: body });
    const token = results.length > 0 ? results[0] : (body.access_token || null);

    if (!token) {
      throw new Error(`[TokenGenerator] No access_token found in ADO token response. Response: ${JSON.stringify(body)}`);
    }

    const expiresIn: number = body.expires_in || 3600;
    this.adoTokenCache = {
      token,
      expiresAt: Date.now() + expiresIn * 1000 - 5000,
    };

    console.log(`[TokenGenerator] ADO token generated (expires in ${expiresIn}s)`);
    return token;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 2: App Bearer Token
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generates an app-specific bearer token (JWT) using the ADO token
   * and user credentials from `ApiRegistry/Tokens.json`.
   * Corresponds to C# TokenGenarator._accessToken_ClickToPay().
   *
   * @param tokenKey - The key under the current environment in Tokens.json
   *   (e.g. "BEW_USER" for SIT, "getToken" for UAT)
   * @returns The app-specific JWT bearer token
   */
  static async generateAppToken(tokenKey: string): Promise<string> {
    if (this.appTokenCache && this.appTokenCache.expiresAt > Date.now()) {
      return this.appTokenCache.token;
    }

    if (!this.pendingAppToken) {
      this.pendingAppToken = this.fetchAppToken(tokenKey).finally(() => {
        this.pendingAppToken = null;
      });
    }
    return this.pendingAppToken;
  }

  private static async fetchAppToken(tokenKey: string): Promise<string> {
    const adoToken = await this.generateAdoToken();

    const tokensData = this.readJsonFile("Tokens.json");
    const env = this.getCurrentEnv();
    const envTokens = tokensData[env];

    if (!envTokens || !envTokens[tokenKey]) {
      throw new Error(
        `[TokenGenerator] Token key "${tokenKey}" not found for environment "${env}" in Tokens.json. ` +
        `Available keys: ${envTokens ? Object.keys(envTokens).join(", ") : "none"}`
      );
    }

    const user = envTokens[tokenKey];
    const gcn = user.GCN;
    const company = user.company;
    const username = user.username;

    if (!gcn || !company || !username) {
      throw new Error(
        `[TokenGenerator] Incomplete user info for "${tokenKey}" in environment "${env}". ` +
        `Required fields: GCN, company, username`
      );
    }

    // Read endpoint from DynamicBearerToken registry
    const regData = this.readJsonFile("DynamicBearerToken.json");
    const regEntry = regData["getToken"];

    let serviceBaseUrl: string;
    try {
      serviceBaseUrl = getApiBaseUrl(regEntry.baseUrl);
    } catch {
      throw new Error(
        `[TokenGenerator] Cannot resolve base URL for service "${regEntry.baseUrl}". ` +
        `Set ${env}_${regEntry.baseUrl.toUpperCase()}_URL in .env.platform.`
      );
    }

    const url = `${serviceBaseUrl.replace(/\/+$/, "")}${regEntry.endPoint}`;
    console.log(`[TokenGenerator] Requesting app token from: ${url}`);
    console.log(`[TokenGenerator] Auth user: ${gcn}`);

    const apiContext = await getAppApiContext();
    const response = await apiContext.get(url, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Authorization: `Bearer ${adoToken}`,
        GCN: gcn,
      },
      params: {
        company,
        username,
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `[TokenGenerator] App token request failed with status ${response.status()}.\nResponse: ${body}`
      );
    }

    const body = await response.json();
    const jpath = regEntry.jpaths?.token || "$.jwt";
    const results = JSONPath({ path: jpath, json: body });
    const token = results.length > 0 ? results[0] : null;

    if (!token) {
      throw new Error(
        `[TokenGenerator] No jwt found in app token response using jpath "${jpath}". ` +
        `Response: ${JSON.stringify(body)}`
      );
    }

    this.appTokenCache = {
      token,
      expiresAt: Date.now() + 3595 * 1000, // assume 1hr TTL, refresh 5s early
    };

    console.log(`[TokenGenerator] App bearer token generated successfully.`);
    return token;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns Authorization headers for API calls.
   * @param tokenKey - The key under the current environment in Tokens.json
   */
  static async getAuthHeaders(tokenKey: string): Promise<Record<string, string>> {
    const token = await this.generateAppToken(tokenKey);
    return { Authorization: `Bearer ${token}` };
  }

  /** Clears all cached tokens, forcing re-authentication on next call. */
  static reset(): void {
    this.adoTokenCache = null;
    this.appTokenCache = null;
  }
}
