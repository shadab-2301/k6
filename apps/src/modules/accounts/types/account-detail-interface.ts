interface Meta {
    resultCount: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    currentPageSize: number;
}

interface Account {
    AccountId: number;
    Accountname: string;
    AccountName: string;
    CategoryId: string;
    AccountType: string;
    Description: string;
    AccountNumber: string;
    OriginalAccountNumber: string;
    OriginalAccountTypeId: string;
    CurrencyCode: string;
    AlternativeAccNo: string;
    OwnerType: number;
    Category: string;
    ActiveFlag: boolean;
    NickName: string;
    CreatedDate: string; // ISO 8601 format
    CapitalBalance: string; // Consider changing to number if needed
    AvailableBalance: string; // Consider changing to number if needed
    ValueDate: string; // ISO 8601 format
    CreditLimit: string; // Consider changing to number if needed
    RateDebit: string; // Consider changing to number if needed
    AccruedDebitInterest: string; // Consider changing to number if needed
    RateCredit: string; // Consider changing to number if needed
    AccruedCreditInterest: string; // Consider changing to number if needed
    StatementFrequency: string;
    StatementMonth: string;
    StatementDay: string;
    LastTransactionDate: string;
    NoOfCardHolders: number;
    PendingTransactionNumber: number;
    PendingTransactionAmount: string; // Consider changing to number if needed
    LastStatementPaid: string; // ISO 8601 format
    PreviousStatementPeriod: string; // ISO 8601 format
    ClosingBalance: string; // Consider changing to number if needed
    MinimumDueAmount: string; // Consider changing to number if needed
    DueDate: string | null; // ISO 8601 format or null
    NoOfInvestements: number;
    InvestmentPendingMaturity: string | null; // ISO 8601 format or null
    NoticeDepositType: string;
    InstantAccessBalance: string; // Consider changing to number if needed
    InstantAccessPercentage: string;
    AmountUnderNotice: string; // Consider changing to number if needed
    AvailableForNotice: string; // Consider changing to number if needed
    AccountPermissions: boolean;
    InterestDistribution: string;
    NoticesBalance: string; // Consider changing to number if needed
    AccountOpenDate: string; // ISO 8601 format
    ActiveRules: number;
    RulesPendingApproval: number;
    CumulativeNoticeAmount: string; // Consider changing to number if needed
    ApprovedDate: string | null; // ISO 8601 format or null
    ApprovedBy: string | null; // or null
    AddedBy: string | null; // or null
    AddedDate: string | null; // ISO 8601 format or null
    InterestNominatedAccount: string;
    NoticeInterestBank: string;
    NoticeInterestAccountName: string;
    NoticeInterestAccount: string;
    AccountDescType: string;
    IsApoAvailable: boolean;
    DebitAccountBankName: string;
    DebitAccountNumber: string;
    DebitDate: string; // ISO 8601 format
    DebitAmount: string; // Consider changing to number if needed
    ReturnedStatus: string | null; // or null
}

interface Filter {
    Currency: string[];
    AccountType: string[];
}

export interface IAccountDetail {
    meta: Meta;
    data: Account[];
    success: string | null; // or null
    filter: Filter[];
    Download: string | null; // or null
}