import * as path from "path";
import * as dotenv from "dotenv";

// Ensure env files are loaded once
const secretsPath = path.resolve(__dirname, "../../.env.secrets");
dotenv.config({ path: secretsPath });

/**
 * Maps friendly user keys used in feature files to their actual
 * environment variable names. Add new mappings here as needed.
 *
 * @example
 * Feature file:  | username       | password |
 *                | BEW_SIngleAuth | PASSWORD |
 * Resolver:      "BEW_SIngleAuth" -> process.env.BEW_SIngleAuth
 */
const CREDENTIAL_MAP: Record<string, { envKey: string; fallbackEnvKey?: string }> = {
  BEW_SIngleAuth: { envKey: "BEW_SIngleAuth" },
  SETUP_USER: { envKey: "BTB_ADD_USERNAME", fallbackEnvKey: "BTB_ADD_USERNAME" },
  APPROVAL_USER: { envKey: "BTB_APPROVE_USERNAME" },
  TST_DUAL_AUTH: { envKey: "TST_USER_DUAL_AUTH" },
};

export interface ResolvedCredentials {
  username: string;
  password: string;
}

function resolveEnvValue(key?: string): string {
  if (!key) return "";
  return (process.env[key] || "").trim();
}

/**
 * Resolves a friendly username key to the actual credential value.
 *
 * @param usernameKey - The key from the feature file (e.g. "BEW_SIngleAuth")
 * @param userType    - Optional user type for SETUP_USER dual-control logic
 * @returns The resolved username and password
 * @throws If the username cannot be resolved
 */
export function resolveCredentials(usernameKey: string, userType?: string, passwordKey?: string): ResolvedCredentials {
  // Resolve username
  let username = "";

  if (usernameKey === "SETUP_USER" && userType === "DUAL_CONTROL") {
    username = process.env.TST_USER_DUAL_AUTH || "";
  } else {
    const mapping = CREDENTIAL_MAP[usernameKey];
    if (mapping) {
      username = process.env[mapping.envKey] || "";
      if (!username && mapping.fallbackEnvKey) {
        username = process.env[mapping.fallbackEnvKey] || "";
      }
    } else {
      // Direct env var lookup (e.g. "BEW_SIngleAuth" -> process.env.BEW_SIngleAuth)
      username = process.env[usernameKey] || "";
    }
  }

  if (!username) {
    throw new Error(
      `[CredentialResolver] Could not resolve username for key "${usernameKey}". ` +
      `Checked env vars: ${JSON.stringify(Object.keys(CREDENTIAL_MAP).map(k => CREDENTIAL_MAP[k].envKey))}. ` +
      `Ensure the variable is set in .env.secrets.`
    );
  }

  // Resolve password (new flow: PASSWORD, legacy flows: SETUP_PASSWORD/APPROVAL_PASSWORD/etc.)
  const password =
    resolveEnvValue(passwordKey) ||
    resolveEnvValue("PASSWORD") ||
    resolveEnvValue("SETUP_PASSWORD") ||
    resolveEnvValue("APPROVAL_PASSWORD");
  if (!password) {
    throw new Error(
      "[CredentialResolver] Could not resolve password. Set one of PASSWORD, SETUP_PASSWORD, APPROVAL_PASSWORD, " +
      "or pass a valid password env key in the feature table."
    );
  }

  console.log(`[CredentialResolver] Resolved "${usernameKey}" -> username: "${username.substring(0, 4)}****"`);

  return { username, password };
}
