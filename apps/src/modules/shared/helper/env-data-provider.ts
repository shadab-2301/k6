import * as fs from "fs";
import * as path from "path";
import { config } from "playwright-with-cucumber-checks";

/**
 * Loads environment-specific test data from apps/test/data/environ/<CURRENT_ENV>/<relativePath>.
 *
 * Every environment folder (e.g. STG, TST) mirrors the same file names/paths, so
 * switching ENVIROMENT_BASE_URL automatically picks up that environment's values
 * without changing any test/step code - just add/update the file under the
 * matching environment folder.
 */
const ENV_DATA_ROOT = path.resolve(__dirname, "../../../../test/data/environ");

function getCurrentEnv(): string {
  const env = ("" + config.BASEURL + "") || process.env.ENVIROMENT_BASE_URL || "";
  return env !== "undefined" ? env : "";
}

export function getEnvTestData<T = any>(relativePath: string): T {
  const env = getCurrentEnv();
  const envRoot = path.resolve(ENV_DATA_ROOT, env);
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const fullPath = path.resolve(envRoot, normalized);

  if (!fullPath.startsWith(envRoot)) {
    throw new Error(`Env test-data path "${relativePath}" resolves outside of ${envRoot}.`);
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `No env test-data file found for environment "${env}" at ${fullPath}. ` +
        `Add apps/test/data/environ/${env}/${normalized} (mirroring the other environment folders).`
    );
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}
