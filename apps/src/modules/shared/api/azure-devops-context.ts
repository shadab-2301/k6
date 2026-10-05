import { APIRequestContext } from "playwright-with-cucumber-checks/dist/web-driver-manager";
import { request } from "playwright-with-cucumber-checks";

/**
 * Shared Azure DevOps API context for test result publishing.
 *
 * In web mode, initialized in hooks.ts BeforeAll.
 * In API-only mode, initialized in api-hooks.ts BeforeAll.
 * Used by rest-helper.ts and azure-integration.ts.
 */

let _apiContext: APIRequestContext | null = null;

export function getAzureDevOpsContext(): APIRequestContext | null {
    return _apiContext;
}

export async function initAzureDevOpsContext(): Promise<APIRequestContext> {
    if (_apiContext) return _apiContext;

    const httpCredentials = {
        username: "",
        password: process.env.SYSTEM_ACCESSTOKEN || process.env.PAT || "",
    };
    const btoa = (str: string) => Buffer.from(str).toString("base64");
    const credentialsBase64 = btoa(`${httpCredentials.username}:${httpCredentials.password}`);

    _apiContext = await request.newContext({
        baseURL: "https://dev.azure.com",
        extraHTTPHeaders: {
            Authorization: `Basic ${credentialsBase64}`,
        },
    });

    return _apiContext;
}

export async function disposeAzureDevOpsContext(): Promise<void> {
    if (_apiContext) {
        await _apiContext.dispose();
        _apiContext = null;
    }
}
