export const ADD_BENEFICIARY_ERRORS = {
    DETAILS: {
        BENEFICIARY_NAME: {
            REQUIRED: 'Beneficiary name is empty and mandatory',
            SPECIAL_CHARS: 'Beneficiary name contains unsupported characters (Only SWIFT characters allowed)'
        }
    }
} as const