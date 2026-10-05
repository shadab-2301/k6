export interface IAccountDetailView {
    accountType: string,
    accountName: string,
    accountNumber: string,
    currency: string,
    accountOpened: string,
    accountStatus: string,
    limit: string;
    debitInterestRate: string;
    interestDistribution: string;
    accruedDebitIntrerest: string;
    creditInterestRate: string;
    accruedCreditIntrerest: string;
    currentBalance: string;
    availableBalance: string
}