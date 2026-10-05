export interface IPendingSubmission {
    submittedDate: string,
    submittedBy: string,
    BeneficiaryName: string,
    RequestType: string,
    TimeLeft: string,
    Approver: string
}

export interface IDeclinedSubmission {
    submittedDate: string,
    submittedBy: string,
    BeneficiaryName: string,
    RequestType: string,
    TimeLeft: string,
    Approver: string
}

export interface IApprovedSubmission {
    submittedDate: string,
    submittedBy: string,
    BeneficiaryName: string,
    RequestType: string,
    TimeLeft: string,
    Approver: string
}