export interface Payment {
  paymentID?: string;
  quickPayType?: string;
  beneficiaryType?: string;
  status?: string;
  debitAccount?: string;
  paymentMethod?: string;
  debtAccountBalance?: string;
  employeeAccount?: string;
  paymentDate?: string;
  originalpaymentdate?: string;
  autoForwaded?: boolean;
  payrollType?: string;
  beneficiary?: string;
  beneficiaryName?: string;
  employeeName?: string;
  beneficiaryAccount?: string;
  adHocAccountNumber?: string;
  bank?: string;
  branchCode?: string;
  accountNumber?: string;
  debitAccRef?: string;
  debitAccountReference?: string;
  beneficiaryReference?: string;
  amount: string;
  proofofpayment?: string[];
  noteForApprover?: string;
  paymentWarning?: string;
  approvalIds?: string[];
  transactionID?: string;
  UETR?: string;
}

/**
 * 
 * review
 *  debitAccRef?: string;
  debitAccountReference?: string;
    quickPayType: string,
  beneficiaryType?: string;
 * 
 */
