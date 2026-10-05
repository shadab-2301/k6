import * as fs from "fs";
import * as path from "path";
import { getApiBaseUrl, getCurrentApiEnv } from "../config/api-config";
import { getAppApiContext } from "../src/modules/shared/api/api-context-manager";
import ApiAuthProvider from "../src/modules/shared/api/api-auth-provider";
import { setLastApiResponse } from "./api-test-state";
import { ApiResponse, getRegistryEntry, setUrl } from "./rest-api-helper";

const TOKENS_PATH = path.resolve(__dirname, "../../ApiRegistry/Tokens.json");

export type ApiUserProfile = {
    userType: string;
    company: string;
    username: string;
    gcn: string;
};

export type ExecuteRegistryApiRequestOptions = {
    regFileName: string;
    regObjectName: string;
    method?: string;
    pathParams?: Record<string, string>;
    queryParams?: Record<string, string | number | boolean>;
    userType?: string;
    includeAuth?: boolean;
    additionalHeaders?: Record<string, string>;
    data?: any;
    multipart?: any;
};

function readTokensData(): Record<string, any> {
    if (!fs.existsSync(TOKENS_PATH)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));
    } catch {
        return {};
    }
}

export function resolveApiUserProfile(userType?: string): ApiUserProfile {
    const env = getCurrentApiEnv();
    const key = String(userType || process.env.TOKEN_KEY || "BEW_USER").trim() || "BEW_USER";
    const tokens = readTokensData();
    const node = tokens?.[env]?.[key] || {};

    return {
        userType: key,
        company: String(node.company || ""),
        username: String(node.username || ""),
        gcn: String(node.GCN || ""),
    };
}

export function logApiRequestContext(
    method: string,
    apiName: string,
    url: string,
    queryParams: Record<string, string | number | boolean> | undefined,
    userProfile: ApiUserProfile
): void {
    console.log("\n========== API REQUEST ==========");
    console.log(`[Request] API      : ${apiName}`);
    console.log(`[Request] Method   : ${method}`);
    console.log(`[Request] URL      : ${url}`);
    if (queryParams) {
        console.log(`[Request] Query    : ${JSON.stringify(queryParams, null, 2)}`);
    }
    console.log(`[Request] UserType : ${userProfile.userType}`);
    console.log(`[Request] Company  : ${userProfile.company}`);
    console.log(`[Request] Username : ${userProfile.username}`);
    console.log(`[Request] GCN      : ${userProfile.gcn}`);
    console.log("=================================\n");
}

export function logApiResponseContext(apiName: string, response: ApiResponse): void {
    console.log("\n========== API RESPONSE ==========");
    console.log(`[Response] API     : ${apiName}`);
    console.log(`[Response] Status  : ${response.status}`);
    console.log(`[Response] Body    : ${JSON.stringify(response.body, null, 2)}`);
    console.log("==================================\n");
}

export async function executeRegistryApiRequest(options: ExecuteRegistryApiRequestOptions): Promise<ApiResponse> {
    const entry = getRegistryEntry(options.regFileName, options.regObjectName);
    const method = String(options.method || entry.requestMethod || "GET").toUpperCase();
    const url = setUrl(options.regFileName, options.regObjectName, options.pathParams);

    const apiContext = await getAppApiContext();
    const apiBaseUrl = getApiBaseUrl(entry.baseUrl as any);
    const includeAuth = options.includeAuth !== false;

    const userProfile = resolveApiUserProfile(options.userType);
    const registryHeaders = (entry.Headers || {}) as Record<string, string>;
    let headers: Record<string, string> = {
        ...registryHeaders,
        ...(options.additionalHeaders || {}),
    };

    if (userProfile.gcn) {
        headers.GCN = userProfile.gcn;
    }

    if (includeAuth) {
        const authHeaders = await ApiAuthProvider.getAuthHeaders(apiContext, apiBaseUrl);
        headers = { ...headers, ...authHeaders };
    } else {
        delete headers.Authorization;
        delete headers.authorization;
    }

    logApiRequestContext(method, options.regObjectName, url, options.queryParams, userProfile);

    let response: any;
    const requestConfig: any = {
        headers,
        params: options.queryParams,
    };

    if (method === "GET") {
        response = await apiContext.get(url, requestConfig);
    } else if (method === "POST") {
        response = await apiContext.post(url, {
            ...requestConfig,
            ...(options.multipart ? { multipart: options.multipart } : {}),
            ...(options.data !== undefined ? { data: options.data } : {}),
        });
    } else if (method === "PUT") {
        response = await apiContext.put(url, {
            ...requestConfig,
            ...(options.data !== undefined ? { data: options.data } : {}),
        });
    } else if (method === "PATCH") {
        response = await apiContext.patch(url, {
            ...requestConfig,
            ...(options.data !== undefined ? { data: options.data } : {}),
        });
    } else if (method === "DELETE") {
        response = await apiContext.delete(url, requestConfig);
    } else {
        throw new Error(`[ApiExecutionHelper] Unsupported HTTP method: ${method}`);
    }

    let body: any;
    try {
        body = await response.json();
    } catch {
        body = await response.text();
    }

    const apiResponse: ApiResponse = {
        status: response.status(),
        body,
        text: typeof body === "string" ? body : JSON.stringify(body),
        headers: response.headers(),
    };

    setLastApiResponse(apiResponse);
    logApiResponseContext(options.regObjectName, apiResponse);

    return apiResponse;
}