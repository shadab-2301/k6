import { request, APIRequestContext } from "playwright-with-cucumber-checks/dist/web-driver-manager";

/**
 * Lazily creates/holds a single, dedicated APIRequestContext for the application's
 * own APIs. It has no fixed baseURL - the registry-driven calls in
 * base-api-client.ts resolve a full, absolute URL per operation (service + endpoint),
 * since a single run may call multiple backend services.
 *
 * This is intentionally kept separate from the `apiContext` created in
 * apps/test/hooks/hooks.ts, which is reserved for publishing results to Azure DevOps
 * (see apps/helper/rest-helper.ts and apps/helper/azure-integration.ts) and must not
 * be reused for application API calls.
 *
 * It's created lazily (on first use) rather than in BeforeAll so that UI-only test
 * runs are unaffected when API env vars haven't been configured yet.
 */
let appApiContext: APIRequestContext | null = null;

export async function getAppApiContext(): Promise<APIRequestContext> {
  if (!appApiContext) {
    appApiContext = await request.newContext({ ignoreHTTPSErrors: true });
  }
  return appApiContext;
}

export async function disposeAppApiContext(): Promise<void> {
  if (appApiContext) {
    try {
      await appApiContext.dispose();
    } finally {
      appApiContext = null;
    }
  }
}
