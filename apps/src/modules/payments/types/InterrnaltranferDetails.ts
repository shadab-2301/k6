export type InterrnaltranferDetails = {
   transferid?: string;
   ftnumber?: string;
   tranferDate?: string;
   numberOfTransfers?: string;
   frequency?: string;
   fromaccount?: string;
   toAccount?: string;
   transfertype?: string;
   amount?: string;
   currency?: string;
   fromaccountreference?: string;
   toaccountreference?: string;
   status?: string;
   firstTransferDate?: string;
   lasttransferdate?: string;
   noteforapprover?: string;
}

export type SingleTransferApprovalDetails = {
       paymentId?: string;
          paymentDate?: string;
          beneficiaryName?: string;
          beneficiaryType?: string;
          debitAccountReference?: string;
          amount?: string;	
}

