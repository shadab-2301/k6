import * as fs from "fs";
import * as path from "path";
import { rootPath } from "./root-path";

/**
 * EnvironmentHandler - Central environment resolution for the entire framework.
 *
 * Resolution order (first non-empty wins):
 *   1. Pipeline env var:  ENVIRONMENT_TIER  (set on Azure DevOps / CI)
 *   2. Legacy env var:    ENVIROMENT_BASE_URL  (set manually in shell)
 *   3. config.ini file:  Resource/EnvironmentHandler/config.ini  (local dev)
 *
 * The resolved tier (e.g. "STG", "TST", "DEV") is written back to
 * `process.env.ENVIROMENT_BASE_URL` so all downstream consumers
 * (api-config, env-data-provider, test-data-handler, token-generator)
 * pick it up automatically.
 *
 * @author Shadab Anwar
 */

// ─────────────────────────────────────────────────────────────────────────────
// Config.ini Parser
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_INI_PATH = path.join(rootPath(), "Resource", "EnvironmentHandler", "config.ini");

const ENVIRONMENT_ALIAS_MAP: Record<string, string> = {
  SIT: "TST",
  STG: "STG",
  UAT: "STG",
  TST: "SIT",
  DEV: "DEV",
};

const ENVIRONMENT_KEY_ALIASES: Record<string, string[]> = {
  STG: ["STG", "SIT"],
  TST: ["TST", "UAT"],
  DEV: ["DEV"],
};

/**
 * Reads the config.ini file and returns all key-value pairs
 * from the [Environment] section.
 *
 * @example
 * // For config.ini containing:
 * // [Environment]
 * // tier=TST
 * parseConfigIni()
 * // => { tier: "TST" }
 */
function parseConfigIni(): Record<string, string> {
  const result: Record<string, string> = {};

  if (!fs.existsSync(CONFIG_INI_PATH)) {
    console.warn(`[EnvironmentHandler] config.ini not found at ${CONFIG_INI_PATH}`);
    return result;
  }

  const content = fs.readFileSync(CONFIG_INI_PATH, "utf-8");
  const lines = content.split("\n");

  for (const raw of lines) {
    const line = raw.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    // Skip section headers like [Environment]
    if (line.startsWith("[") && line.endsWith("]")) continue;

    // Parse key=value
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();

    // Strip surrounding quotes if present
    result[key] = value.replace(/^["']|["']$/g, "");
  }

  return result;
}

function readRawEnvironmentValue(): string {
  const pipelineTier = (process.env.ENVIRONMENT_TIER || "").trim();
  if (pipelineTier && pipelineTier !== "undefined") {
    return pipelineTier;
  }

  const legacyEnv = (process.env.ENVIROMENT_BASE_URL || "").trim();
  if (legacyEnv && legacyEnv !== "undefined") {
    return legacyEnv;
  }

  const ini = parseConfigIni();
  return (ini.tier || "").trim();
}

export function normalizeEnvironmentTier(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http")) {
    const upperUrl = raw.toUpperCase();
    if (upperUrl.includes(".STG.") || upperUrl.includes("LOGINSTG") || upperUrl.includes("SIT")) return "STG";
    if (upperUrl.includes(".TST.") || upperUrl.includes("LOGINTEST") || upperUrl.includes("UAT")) return "TST";
    if (upperUrl.includes("DEV")) return "DEV";
    return raw;
  }

  const upper = raw.toUpperCase();
  return ENVIRONMENT_ALIAS_MAP[upper] || upper;
}

export function getEnvironmentAliases(tier: string): string[] {
  const normalizedTier = normalizeEnvironmentTier(tier);
  return ENVIRONMENT_KEY_ALIASES[normalizedTier] || [normalizedTier];
}

function getFirstDefinedEnv(keys: string[]): string {
  for (const key of keys) {
    const value = (process.env[key] || "").trim();
    if (value && value !== "undefined") {
      return value;
    }
  }
  return "";
}

export function getUiBaseUrlForTier(tier: string): string {
  const normalizedTier = normalizeEnvironmentTier(tier);
  const envKeys = getEnvironmentAliases(normalizedTier).map((alias) => `${alias}_URL`);
  return getFirstDefinedEnv(envKeys);
}

export function resolveUiBaseUrl(): string {
  const rawValue = readRawEnvironmentValue();
  if (rawValue.startsWith("http")) {
    return rawValue;
  }

  const tier = normalizeEnvironmentTier(rawValue);
  return getUiBaseUrlForTier(tier);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the current environment tier using the priority chain:
 *   1. ENVIRONMENT_TIER (pipeline)
 *   2. ENVIROMENT_BASE_URL (legacy shell)
 *   3. config.ini tier value (local dev)
 *
 * Sets `process.env.ENVIROMENT_BASE_URL` to the resolved value
 * so all downstream code picks it up.
 *
 * @returns The resolved environment tier ("STG", "TST", "DEV", etc.)
 *
 * @example
 * // config.ini has tier=TST
 * const env = resolveEnvironment();
 * // process.env.ENVIROMENT_BASE_URL === "TST"
 */
export function resolveEnvironment(): string {
  const rawValue = readRawEnvironmentValue();
  const tier = normalizeEnvironmentTier(rawValue);
  if (tier) {
    setEnv(tier);
    console.log(`[EnvironmentHandler] Resolved environment: raw=${rawValue || "<empty>"}, tier=${tier}`);
    return tier;
  }

  // Nothing found
  console.warn(
    "[EnvironmentHandler] No environment resolved. " +
    "Set ENVIRONMENT_TIER, ENVIROMENT_BASE_URL, or tier in config.ini."
  );
  return "";
}

/**
 * Returns the resolved environment tier without side effects.
 * Useful for read-only checks.
 */
export function getEnvironmentTier(): string {
  return normalizeEnvironmentTier(readRawEnvironmentValue());
}

/**
 * Writes the resolved tier back to process.env.ENVIROMENT_BASE_URL
 * so all downstream consumers pick it up.
 */
function setEnv(tier: string): void {
  process.env.ENVIRONMENT_TIER = tier;
  process.env.ENVIROMENT_BASE_URL = tier;
}
