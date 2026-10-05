interface Meta {
    resultCount: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    currentPageSize: number;
}

interface Account {
    AccountId: string; // Use string for AccountId
    AccountName: string;
    CurrencyCode: string;
    AccountNumber: string;
    AccountType: string;
    AvailableBalance: number; // Consider changing to number for monetary values
    Balance: number; // Consider changing to number for monetary values
    NickName: string;
    ElectronicAccountNumber?: string; // Optional if not always present
}

interface Filter {
    Currency: string[];
    AccountType: string[];
}

export interface IAccountsList {
    meta: Meta | null; // Meta information (can be null)
    data: Account[]; // Array of account details
    success: any; // Success status (can be null)
    filter: Filter[]; // Filter options
    Download: any; // Download information (can be null)
}