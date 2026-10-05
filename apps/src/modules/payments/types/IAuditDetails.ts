import { IPaymentDetails } from "./PaymentDetails"
import { IPayerDetail } from "./RequestDetails"
import { IRequestorDetail } from "./RequestorDetails"

export interface IRTPAuditDetails {
    overview: IOverview | null
    requestorDetails: IRequestorDetail,
    payerDetails: IPayerDetail,
    paymentDetails: IPaymentDetails
}

export interface IOverview {
    submittedBy: string | null,
    approvedBy: string | null
}