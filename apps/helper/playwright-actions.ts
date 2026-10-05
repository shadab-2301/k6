import { Locator } from "@playwright/test"

/**
 * Gets the text content of a locator and trims any white spaces
 * @param {string} locator - The locator to retrieve the text content from
 * @returns {string} - The trimmed text content
 */

export const getTextContent = async (locator: Locator) => {
    const elementText = await locator.textContent()
    if (elementText) {
        return elementText.trim();
    }
}