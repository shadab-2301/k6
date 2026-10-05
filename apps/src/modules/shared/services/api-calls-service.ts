import { page } from "playwright-with-cucumber-checks";
import Action from "../../../../helper/actions";

export const getInterceptedAPIResponse = async () => {
    await page.waitForLoadState('load');
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const data = JSON.parse(fileData);
    const userInfo = data.interceptedEndpoints[data.interceptedEndpoints.length - 1]
    return userInfo;
}