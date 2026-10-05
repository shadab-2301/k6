import { config } from "playwright-with-cucumber-checks";
import { baseUrl } from "../../../../config/env-variables.configs";


export const PAYSHARP_ID_TYPE = {
    SHARP_ID: "SharpID",
    BANK_ACCOUNT: "Bank account",
} as const;

export const RTP_STEPPER = {
    DASHBOARD: {
        NAME: null,
        PAGE_HEADING: null,
        PAGE_SUB_TITLE: null,
        FORM_SECTION_HEADING: null,
        URL: `${baseUrl["" + config.BASEURL + ""]}/bb-wpaas/business-banking/bb/payments/dashboard/payshap-request-requestor/active`
    },
    DETAILS: {
        NAME: 'Details',
        PAGE_HEADING: 'Generate Request to Pay (Requestor)',
        PAGE_SUB_TITLE: null,
        FORM_SECTION_HEADING: ['Requestor details', 'Payer details'],
        URL: `${baseUrl["" + config.BASEURL + ""]}/bb-wpaas/business-banking/bb/payments/details/payshap-request-requestor/stepper/create/details`
    },
    AMOUNT: {
        NAME: 'Amount',
        PAGE_HEADING: 'Generate Request to Pay (Receipt)',
        FORM_SECTION_HEADING: ['Requested payment details'],
        URL: `${baseUrl["" + config.BASEURL + ""]}/bb-wpaas/business-banking/bb/payments/details/payshap-request-requestor/stepper/create/requester`
    },
    VERIFY: {
        NAME: 'Verify',
        PAGE_HEADING: 'Generate Request to Pay (Receipt)',
        PAGE_SUB_TITLE: 'Please verify that the following information is correct. If the information is correct, you can Submit and Approve.',
        FORM_SECTION_HEADING: ['Requestor details', 'Payer details'],
        URL: `${baseUrl["" + config.BASEURL + ""]}/bb-wpaas/business-banking/bb/payments/details/payshap-request-requestor/stepper/create/verify`
    },
    SUMMARY: {
        NAME: 'Summary',
        PAGE_HEADING: 'Generate Request to Pay (Receipt)',
        PAGE_SUB_TITLE: 'Please verify that the following information is correct. If the information is correct, you can Submit and Approve.',
        FORM_SECTION_HEADING: ['Requestor details', 'Payer details'],
        URL: `${baseUrl["" + config.BASEURL + ""]}/bb-wpaas/business-banking/bb/payments/details/payshap-request-requestor/stepper/create/summary`
    }
} as const;