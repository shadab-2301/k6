export interface IRTPAuditEntry {
    requestDate: string | undefined | null,
    payerName: string | null | undefined,
    sharpID?: string | undefined | null,
    requestedAmount: string | undefined | null,
    myReference: string | undefined | null,
    status: string | undefined | null,
}