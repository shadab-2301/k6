/**
 * Stub/Mock Page Object
 * Used for API-only scenarios to satisfy step definition file type requirements
 * without launching an actual Chromium browser
 */

export class StubPage {
    /**
     * Create a proxy that satisfies Playwright Page type requirements
     * without actual browser operations
     */
    static createStubPage(): any {
        return new Proxy(
            {},
            {
                get: () => {
                    // Return stub functions that don't throw
                    return function () {
                        return Promise.resolve(undefined);
                    };
                },
            }
        );
    }

    /**
     * Create a stub FrameLocator for iframe operations
     */
    static createStubFrameLocator(): any {
        return new Proxy(
            {},
            {
                get: () => {
                    return function () {
                        return StubPage.createStubLocator();
                    };
                },
            }
        );
    }

    /**
     * Create a stub Locator for element interactions
     */
    static createStubLocator(): any {
        return new Proxy(
            {},
            {
                get: (target: any, prop: string | symbol) => {
                    // Locator methods that return promises
                    if (['click', 'fill', 'type', 'clear', 'check', 'uncheck'].includes(String(prop))) {
                        return () => Promise.resolve();
                    }
                    // Locator methods that return values
                    if (['textContent', 'getAttribute', 'inputValue', 'count'].includes(String(prop))) {
                        return () => Promise.resolve(null);
                    }
                    // Locator properties and chaining methods
                    if (['first', 'last', 'nth', 'frameLocator', 'locator'].includes(String(prop))) {
                        return () => StubPage.createStubLocator();
                    }
                    // Default to stub function
                    return function () {
                        return Promise.resolve(StubPage.createStubLocator());
                    };
                },
            }
        );
    }
}

/**
 * Global stub page instance for API-only scenarios
 */
export let globalStubPage = StubPage.createStubPage();

/**
 * Reset the global stub page (called when switching to real browser)
 */
export function resetGlobalStubPage() {
    globalStubPage = StubPage.createStubPage();
}
