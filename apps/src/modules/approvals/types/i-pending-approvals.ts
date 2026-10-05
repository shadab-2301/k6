interface IExpiry {
    Time: number;
    TimeDescription: string;
    TimeLeftValue: string;
    TimeLeftLabel: string;
}

interface IAmount {
    value: number;
    currency: string;
}

interface IDepositAccount {
    currency: string;
    name: string;
    number: string;
    investecFeeRecovery: string | null;
}

interface ISubStatus {
    Id: number;
    Status: string;
    Bg: string;
    StatusMsg: string;
}

interface IReceipt {
    receiptId: string;
    transactionId: string;
    dateReceived: string;
    account: string;
    accountName: string | null;
    accountNickname: string | null;
    remitterName: string;
    reference: string;
    expiry: IExpiry;
    amount: IAmount;
    status: string;
    statusCode: string | null;
    type: string;
    subStatus: ISubStatus | null;
    depositAccount: IDepositAccount;
}

interface IFilter {
    receiptType: string[];
    currencyCode: string[];
    expiry: string[];
    receiptStatus: string | null;
}

export interface IPendingReceipts {
    data: IReceipt[];
    success: boolean | null;
    filter: IFilter[];
    Download: string | null;
}