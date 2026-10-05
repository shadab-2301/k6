import { config } from "playwright-with-cucumber-checks";
import { getEnvironmentAliases, getEnvironmentTier } from "../helper/environment-handler";

require("dotenv").config();
require("dotenv").config({ path: ".env.platform" });
require("dotenv").config({ path: ".env.secrets" });

const ENV = process.env;

function getFirstDefinedEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = ENV[key];
    if (value && value !== "undefined") {
      return value;
    }
  }
  return undefined;
}

/**
 * Per-environment base URLs shared with the UI, sourced from .env.platform
 * (STG_URL / TST_URL / DEV_URL). Used as the default host for every logical
 * API service unless a service-specific override is set.
 */
const platformBaseUrl: Record<string, string | undefined> = {
  STG: getFirstDefinedEnv("STG_URL", "SIT_URL"),
  TST: getFirstDefinedEnv("TST_URL", "UAT_URL"),
  DEV: getFirstDefinedEnv("DEV_URL"),
};

function getServiceUrl(env: string, serviceKey: ApiServiceKey): string | undefined {
  const aliases = getEnvironmentAliases(env);

  if (serviceKey === API_SERVICES.BAAPI) {
    for (const alias of aliases) {
      const url = getFirstDefinedEnv(`${alias}_BAAPI_URL`, `${alias}_BAPI_URL`);
      if (url) return url;
    }
    return platformBaseUrl[env];
  }

  for (const alias of aliases) {
    const url = getFirstDefinedEnv(`${alias}_${serviceKey.toUpperCase()}_URL`);
    if (url) return url;
  }

  return platformBaseUrl[env];
}

function getServiceEnvVarNames(env: string, serviceKey: ApiServiceKey): string[] {
  const aliases = getEnvironmentAliases(env);

  if (serviceKey === API_SERVICES.BAAPI) {
    return aliases.flatMap((alias) => [`${alias}_BAAPI_URL`, `${alias}_BAPI_URL`]);
  }

  return aliases.map((alias) => `${alias}_${serviceKey.toUpperCase()}_URL`);
}

/**
 * Type-safe API service keys. Use these constants when calling getApiBaseUrl()
 * or when referencing a service in api-registry.json entries.
 */
export const API_SERVICES = {
  BAAPI: "baapi",
  CAPI: "capi",
} as const;

export type ApiServiceKey = (typeof API_SERVICES)[keyof typeof API_SERVICES];

/**
 * Per-service, per-environment API base URLs.
 * The registry (api-registry.json) references a service by its logical key
 * (e.g. "baapi", "capi"), which is resolved here to a real host per environment.
 *
 * Env var naming convention: <ENV>_<SERVICE>_URL
 *   e.g. TST_BAAPI_URL, TST_BAPI_URL, TST_CAPI_URL
 *
 * Falls back to the platform UI base URL if a service-specific var is not set.
 * For BAAPI, both BAAPI and legacy BAPI aliases are supported.
 */
export const apiBaseUrl: Record<ApiServiceKey, Record<string, string | undefined>> = {
  baapi: {
    STG: getServiceUrl("STG", API_SERVICES.BAAPI),
    TST: getServiceUrl("TST", API_SERVICES.BAAPI),
    DEV: getServiceUrl("DEV", API_SERVICES.BAAPI),
  },
  capi: {
    STG: getServiceUrl("STG", API_SERVICES.CAPI),
    TST: getServiceUrl("TST", API_SERVICES.CAPI),
    DEV: getServiceUrl("DEV", API_SERVICES.CAPI),
  },
};

export interface ApiCredentials {
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Placeholder login endpoint for the dedicated API auth call (separate from UI login).
 * Update API_LOGIN_ENDPOINT in .env/.env.secrets once the real endpoint is confirmed.
 */
export const API_LOGIN_ENDPOINT = ENV.API_LOGIN_ENDPOINT || "/auth/token";

export function getCurrentApiEnv(): string {
  // 1. Check config.BASEURL first (set by hooks.ts/hybrid-hooks.ts to the tier key)
  const configEnv = ("" + config.BASEURL + "");
  if (configEnv && configEnv !== "undefined") return configEnv;

  // 2. Check ENVIRONMENT_TIER pipeline var (always a tier key)
  const pipelineTier = (ENV.ENVIRONMENT_TIER || "").trim();
  if (pipelineTier && pipelineTier !== "undefined") return pipelineTier;

  // 3. Check config.ini (always a tier key)
  const tier = getEnvironmentTier();
  if (tier && !tier.startsWith("http")) return tier;

  // 4. Auto-detect from configured service URLs
  if (ENV.STG_BAAPI_URL || ENV.STG_BAPI_URL || ENV.SIT_BAAPI_URL || ENV.SIT_BAPI_URL) return "STG";
  if (ENV.TST_BAAPI_URL || ENV.TST_BAPI_URL || ENV.UAT_BAAPI_URL || ENV.UAT_BAPI_URL) return "TST";
  return "";
}

/**
 * Resolves a logical service key (e.g. "baapi", "capi") to the real base URL
 * for the current environment.
 *
 * @example
 * const url = getApiBaseUrl("baapi");  // from TST_BAAPI_URL or TST_BAPI_URL
 * const url = getApiBaseUrl("capi");   // "https://tps-capi.stg.ikea.investec.io"
 */
export function getApiBaseUrl(serviceKey: ApiServiceKey): string {
  const env = getCurrentApiEnv();
  const url = apiBaseUrl[serviceKey]?.[env];
  if (!url) {
    const envVarNames = getServiceEnvVarNames(env, serviceKey);
    throw new Error(
      `API base URL is not configured for service "${serviceKey}" / environment "${env}". ` +
      `Set ${envVarNames.join(" or ")} in pipeline variables, .env.platform, or override it in .env/.env.secrets.`
    );
  }
  return url;
}

/** Convenience getter for BAPI base URL. */
export function getBaapiBaseUrl(): string {
  return getApiBaseUrl(API_SERVICES.BAAPI);
}

/** Convenience getter for CAPI base URL. */
export function getCapiBaseUrl(): string {
  return getApiBaseUrl(API_SERVICES.CAPI);
}

/**
 * Per-environment API-only credentials, e.g. API_USERNAME_STG / API_PASSWORD_STG
 * or API_CLIENT_ID_STG / API_CLIENT_SECRET_STG, depending on the real login contract.
 */
export function getApiCredentials(): ApiCredentials {
  const env = getCurrentApiEnv();
  const aliases = getEnvironmentAliases(env);

  const resolveCredential = (prefix: string): string | undefined => {
    for (const alias of aliases) {
      const value = ENV[`${prefix}_${alias}`];
      if (value && value !== "undefined") {
        return value;
      }
    }
    return undefined;
  };

  return {
    username: resolveCredential("API_USERNAME"),
    password: resolveCredential("API_PASSWORD"),
    clientId: resolveCredential("API_CLIENT_ID"),
    clientSecret: resolveCredential("API_CLIENT_SECRET"),
  };
}
