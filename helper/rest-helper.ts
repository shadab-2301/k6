import { getAzureDevOpsContext } from "../src/modules/shared/api/azure-devops-context";

export default class RestHelper {

  private static getContext() {
    const ctx = getAzureDevOpsContext();
    if (!ctx) {
      throw new Error(
        "[RestHelper] Azure DevOps API context is not initialized. " +
        "Ensure BeforeAll hook has run (hooks.ts or api-hooks.ts)."
      );
    }
    return ctx;
  }

  static async sendGETRequest(endpoint: string) {
    const apiContext = this.getContext();
    const response = await apiContext.get(endpoint);
    await RestHelper._checkTokenError(response, 'GET', endpoint);
    return response;
  }

  static async sendPOSTRequest(endpoint: string) {
    const apiContext = this.getContext();
    const response = await apiContext.post(endpoint);
    await RestHelper._checkTokenError(response, 'POST', endpoint);
    return response;
  }

  static async CreateTestPan(endpoint: string, data: any) {
    const apiContext = this.getContext();
    const response = await apiContext.post(endpoint, { data });
    await RestHelper._checkTokenError(response, 'POST', endpoint);
    return response;
  }

  static async sendPatchRequest(endpoint: string, data: any) {
    const apiContext = this.getContext();
    const response = await apiContext.patch(endpoint, { data });
    await RestHelper._checkTokenError(response, 'PATCH', endpoint);
    return response;
  }

  private static async _checkTokenError(response: any, method: string, endpoint: string) {
    if (response.status && (response.status() === 401 || response.status() === 403)) {
      const body = await response.text();
      console.error(`\n[AUTH ERROR] ${method} ${endpoint} failed with status ${response.status()}. Possible expired or invalid PAT token.\nResponse: ${body}\n`);
    }
  }
}
