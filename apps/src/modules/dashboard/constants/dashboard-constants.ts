import { config } from "playwright-with-cucumber-checks";
import { baseUrl } from "../../../../config/env-variables.configs";

export const MODULE_ = {
    DASHBOARD: {
        NAME: null,
        PAGE_HEADING: null,
        PAGE_SUB_TITLE: null,
        FORM_SECTION_HEADING: null,
        URL: `${baseUrl["" + config.BASEURL + ""]}/business-banking/bb/payments/dashboard/payshap-request-requestor/active`
    }
} as const;