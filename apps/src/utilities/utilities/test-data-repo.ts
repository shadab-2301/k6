import Action from "../../../helper/actions";

export const getAccountNumber = async () => {
    const fileData = await Action.ReadFileContent("/test/data/bank-details.json");
    const records = JSON.parse(fileData);
    const accounts = records.ABSA[0]
    return accounts;
}

export const getAccountNumberByIndex = async (index: number) => {
    const fileData = await Action.ReadFileContent("/test/data/bank-details.json");
    const records = JSON.parse(fileData);
    const accounts = records.ABSA[index]
    return accounts;
}

export const getAccontByBankName = async (bankName: string) => {
    const fileData = await Action.ReadFileContent("/test/data/bank-details.json");
    const records = JSON.parse(fileData);
    const accounts = records["" + bankName + ""]
    return accounts[0];
}

export const getAccounts = async () => {
    const fileData = await Action.ReadFileContent("/test/data/bank-details.json");
    const records = JSON.parse(fileData);
    return records.ABSA;
}

export const getDomesticBeneficiaryDetails = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const records = JSON.parse(fileData);
    const beneficiaryDetails = records.domesticBeneficiaries[records.domesticBeneficiaries.length - 1]
    return beneficiaryDetails;
}

export const getAmendedDomesticBeneficiaryDetails = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const records = JSON.parse(fileData);
    const beneficiaryDetails = records.amenededDomesticBeneficiary[records.amenededDomesticBeneficiary.length - 1]
    return beneficiaryDetails;
}

export const getInternationalBeneficiaryDetails = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const records = JSON.parse(fileData);
    const beneficiaryDetails = records.internationalBeneficiaries[records.internationalBeneficiaries.length - 1]
    return beneficiaryDetails;
}

export const getPayrollBeneficiaryDetails = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const records = JSON.parse(fileData);
    const beneficiaryDetails = records.payrollBeneficiaries[records.payrollBeneficiaries.length - 1]
    return beneficiaryDetails;
}

export const getExecutivePayrollBeneficiaryDetails = async () => {
    const fileData = await Action.ReadFileContent("/apps/cxt-web-bb-e2e/test/data/test.json");
    const records = JSON.parse(fileData);
    const beneficiaryDetails = records.executiveBeneficiaries[records.executiveBeneficiaries.length - 1]
    return beneficiaryDetails;
}