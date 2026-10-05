import { config } from "playwright-with-cucumber-checks";
import { baseUrl } from "../../../../config/env-variables.configs";


export const ADD_BENEFICIARY_STEPS = {
    VERIFY: {
        NAME: "Verify",
        PAGE_HEADING: "Verify",
        PAGE_SUB_TITLE: "Please verify that the following information is correct. If the information is correct, you can submit for approval.",
    },
    SUMMARY: {
        NAME: "Summary",
        PAGE_HEADING: "Summary",
        PAGE_SUB_TITLE: "The following has been submitted for approval.",
    }

} as const;