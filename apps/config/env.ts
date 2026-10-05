/**
 * Centralized environment variable access.
 *
 * Local development: values come from .env.secrets (loaded by dotenv in hooks).
 * Pipeline: values come from pipeline variables (already in process.env before dotenv runs).
 *
 * Feature files reference env var NAMES (e.g. "8106225153086", "PASSWORD").
 * login-page.ts resolves them via process.env[username].
 *
 * @author Shadab Anwar
 */

export default class ENV {
  // ── UI Credentials ──────────────────────────────────────────────────────
  static PASSWORD = process.env.PASSWORD;

  // ── API Credentials ─────────────────────────────────────────────────────
  static API_TOKEN_KEY = process.env.API_TOKEN_KEY;

  // ── Environment URLs ────────────────────────────────────────────────────
  static STG_URL = process.env.STG_URL;
  static TST_URL = process.env.TST_URL;
  static DEV_URL = process.env.DEV_URL;

  static STG_BAPI_URL = process.env.STG_BAPI_URL;
  static TST_BAPI_URL = process.env.TST_BAPI_URL;

  static STG_CAPI_URL = process.env.STG_CAPI_URL;
  static TST_CAPI_URL = process.env.TST_CAPI_URL;

  // ── Azure DevOps ────────────────────────────────────────────────────────
  static AZURE_TEST_SUITE_ID = process.env.AZURE_TEST_SUITE_ID;

  // ── App Config ──────────────────────────────────────────────────────────
  static ROOT = process.env.ROOT;
  static LOGIN = process.env.LOGIN;
  static USER_TYPES = process.env.USER_TYPES;

  // ── Browser ─────────────────────────────────────────────────────────────
  static CHROME = process.env.CHROME;
  static WEBKIT = process.env.WEBKIT;
  static FIREFOX = process.env.FIREFOX;
}
