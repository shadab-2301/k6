import { IBankDetails } from "../../shared/types/bank-details-interface";
import { IBeneficiaryContacts } from "./beneficiary-contacts-interface";
import { IBeneficiaryReferences } from "./beneficiary-reference-interface";

export interface IDomesticBeneficiary {
    beneficiaryName: string,
    beneficiaryGroup: string,
    bankDetails: IBankDetails,
    beneficiaryReferences: IBeneficiaryReferences,
    beneficiaryContacts: IBeneficiaryContacts,
    noreForApprover: string
}