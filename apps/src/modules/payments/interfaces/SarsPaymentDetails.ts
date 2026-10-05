export interface SarsPaymentDetails {
  beneficiaryname: string;
  debitaccount: string;
  originatingdate: string;
  amount: string | number;
  availablebalance: string | number;
  duedate: string;
  sarspaymentreferenctest: string;
  category: string;
  paymentDate: string;
  debitAccountReference: string;
  paymentID?: string;
  proofofpayment?: string[];
  noteForApproverdocuments?: string[];
  noteForApprover?: string;
  paymentWarning?: string;
  approvalIds?: string[];
  transactionID?: string;
  UETR?: string;
}