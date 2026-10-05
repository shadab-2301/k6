import { expect, page } from "playwright-with-cucumber-checks";
import Action from "./actions";

export default class APIInterceptor {
    public static interceptedResponse: any | null = null;
    public static interceptedQueryParams: any | null = null;
    public static interceptedStatus: number | null = null;
    public static interceptedUrl: string | null = null;
    public static interceptedHeaders: Record<string, string> | null = null;

    public static async InterceptServiceCall_old(url: string) {
        // Reset intercepted response before setting a new interception
        this.interceptedResponse = null;
        this.interceptedStatus = null;
        this.interceptedHeaders = null;


        try {
            await page.route(url, async (route, request) => {

                const url = request.url();
                this.interceptedQueryParams = new URL(url).searchParams;

                const response = await route.fetch();
                if (response.ok()) {
                    this.interceptedResponse = await response.json();
                    await route.fulfill({ json: this.interceptedResponse });
                } else {
                    console.error('Error fetching the response:', response.statusText());
                    await route.fulfill({ status: response.status(), body: 'Error' });
                }
            })
        } catch (error) {
        }




    }

    public static InterceptServiceCall(urlPart: string) {
        this.interceptedResponse = null;
        this.interceptedQueryParams = null;
        let responsePromise;
        urlPart = urlPart.replace(/\*/g, '').trim();
        page.on('response', async response => {

            if (response.url().includes(urlPart)) {
                this.interceptedStatus = response.status();
            }

            this.interceptedUrl = response.url();
            if (response.status() === 200 && response.url().includes(urlPart)) {
                responsePromise = response;
                this.interceptedQueryParams = new URL(response.url()).searchParams;


                const headers = response.headers();
                const ct = headers['content-type'] || headers['Content-Type'] || '';

                if (ct.includes('application/json')) {
                    this.interceptedResponse = await response.json();
                } else {
                    this.interceptedResponse = await response.text();
                }
                return;
            }
        });
    }

    public static async InterceptAndMockAPI(url: string, mockData: any) {
        await page.route(url, async (route) => { 
            await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify(mockData),
            });
        });
    }

    public static async getInterceptedAPIResponse(): Promise<any | null> {
        return this.interceptedResponse; // Return the stored response
    }

    public static getInterceptedStatus(): number | null {
        return this.interceptedStatus;
    }

    public static getInterceptedUrl(): string | null {

        return this.interceptedUrl;
    }

    public static getInterceptedHeaders(): Record<string, string> | null {
        return this.interceptedHeaders;
    }


}

