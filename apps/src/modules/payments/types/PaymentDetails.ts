export interface IPaymentDetails {
    requestedAmount: string | undefined | null,
    amountOption: string | undefined | null,
    minimumAmount?: string,
    myReference: string | undefined | null,
    requestDate: string | undefined | null,
    expirtyTime: string | undefined | null,
}