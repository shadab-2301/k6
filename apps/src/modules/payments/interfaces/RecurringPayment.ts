import { Payment } from "./Payment";

export interface RecurringPayment extends Payment {
  frequency: string;
  firstPaymentDate: string;
  lastPaymentDate: string;
  numberOfPayments: string;
  nonBankingProcessing?: string;
  employeeType?: string;
  employeeBankDetails?: string;
}