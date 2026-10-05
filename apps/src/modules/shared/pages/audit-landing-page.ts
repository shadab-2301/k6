import { page, FrameLocator, Locator } from "playwright-with-cucumber-checks";
import { cwd } from "process";
import { convertDateString, formatDate } from "../../../../helper/date-utils";
import { iframeId } from "../../../../config/global-configs";




export default class AuditLandingPage {
    static iframe: FrameLocator;



    constructor() {
        AuditLandingPage.iframe = page.frameLocator(iframeId);
    }

    static async getAudiRecordByReference(reference: string) {
        return AuditLandingPage.iframe.locator("(//span[contains(text(), '" + reference + "')]//parent::td//parent::tr)[2]//td[last()]");
    }

    static async searchRecord(uniqueIdenfier: string) {
        return AuditLandingPage.iframe.locator("//input[@formcontrolname='basicSearch']").fill(uniqueIdenfier)
    }

    static async getAuditEntryDetails(uniqueIdenfier: string) {
        return AuditLandingPage.iframe.locator("(//span[contains(text(), '" + uniqueIdenfier + "')])[2]//parent::td//parent::tr//td//span[not(contains(@class, 'd-block'))]");
    }

    static async getStatusBadge(uniqueIdenfier: string) {
        return AuditLandingPage.iframe.locator("(//span[contains(text(), '" + uniqueIdenfier + "')]//parent::td//parent::tr)[2]//td//span[contains(@class, 'badge-info')] [last()]");
    }

    static async getPaymentDetails(uniqueIdentifier: string) {
        const auditRecords = await AuditLandingPage.getAuditEntryDetails(uniqueIdentifier);
        let auditEntries = {
            requestDate: await auditRecords.first().textContent(),
            payerName: await auditRecords.nth(1).textContent(),
            requestedAmount: await auditRecords.nth(4).textContent(),
            myReference: await auditRecords.nth(5).textContent(),
            status: await (await AuditLandingPage.getStatusBadge(uniqueIdentifier)).textContent()
        };

        if (auditEntries.requestDate) {
            const convertedDate = convertDateString(auditEntries.requestDate, "/")
            auditEntries.requestDate = formatDate(convertedDate, "-");
        }

        return auditEntries;
    }
}