
export const ApolloModuleNavMenu = {
    BENEFICIARY: ['Overview', 'Active', 'Groups', 'Drafts', 'Deleted', 'Submissions']
}

export const ApolloPageDetails = {

    BENEFICIARIES: {
        LANDING: {
            HEADING: "Beneficiaries"
        },
        ADD: {
            HEADING: "Beneficiaries",
            SUB_HEADING: "Add domestic beneficiary",
            INSTRUCTION: "Please enter beneficiary details OR upload a file"
        },

        VERIFY: {
            HEADING: "Verify",
            SUB_HEADING: null,
            INSTRUCTION: "Please verify that the following information is correct. If the information is correct, you can submit for approval."
        }
    }


} as const;