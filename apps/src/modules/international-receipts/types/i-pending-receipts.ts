interface Meta {
    resultCount: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    currentPageSize: number;
}

interface Expiry {
    Time: number;
    TimeDescription: string;
    TimeLeftValue: string;
    TimeLeftLabel: string;
}

export interface Amount {
    value: number; // Use number for monetary values
    currency: string;
}

interface SubStatus {
    Id: number;
    Status: string;
    Bg: string;
    StatusMsg: string;
}

interface DepositAccount {
    currency: string;
    name: string;
    number: string;
    investecFeeRecovery: string | null; // or null
}

interface Data {
    receiptId: string;
    transactionId: string;
    dateReceived: string; // ISO 8601 format
    account: string;
    accountName: string;
    accountNickname: string;
    remitterName: string;
    reference: string;
    expiry: Expiry;
    amount: Amount;
    status: string;
    statusCode: string;
    type: string;
    subStatus: SubStatus | null; // or null
    depositAccount: DepositAccount;
}

interface Filter {
    receiptType: string[];
    currencyCode: string[];
    expiry: string[];
    receiptStatus: string | null; // or null
}

interface Links {
    self: string;
    first: string | null; // or null
    last: string | null; // or null
    prev: string | null; // or null
    next: string | null; // or null
}

export interface IPendingReceipt {
    meta: Meta;
    data: Data[];
    success: string | null; // or null
    filter: Filter[];
    Download: string | null; // or null
}
