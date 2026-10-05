import * as path from "path";

/**
 * RootPath - TypeScript equivalent of the C# APIAutomationFramework.Utilities.RootPath.
 *
 * Returns the project root directory (the folder containing package.json).
 * All relative paths should be resolved from this root to avoid
 * hard-coded absolute paths and path-mismatch issues across environments.
 *
 * Usage:
 *   import { rootPath } from "../helper/root-path";
 *   const schemaPath = path.join(rootPath(), ".azuredevops", "API-Schema", "...", "schema.json");
 *
 * @author Shadab Anwar
 */

const ROOT: string = path.resolve(__dirname, "../..");

export function rootPath(): string {
  return ROOT;
}
