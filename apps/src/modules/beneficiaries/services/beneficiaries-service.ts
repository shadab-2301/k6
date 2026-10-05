import Action from "../../../../helper/actions";
import { camelCaseString } from "../../../../helper/string-manipulation";


export const getPendingDomesticBeneficiries = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const pendingBeneficiries = JSON.parse(fileData);
    const beneficairyDetails = pendingBeneficiries.domesticBeneficiaries[pendingBeneficiries.domesticBeneficiaries.length - 1]
    return beneficairyDetails;
}

export const getPendingApprovedBeneficiries = async () => {
    const fileData = await Action.ReadFileContent("/apps/cxt-web-bb-e2e/test/data/test.json");
    const pendingBeneficiries = JSON.parse(fileData);
    const beneficairyDetails = pendingBeneficiries.approvedBeneficiaries[pendingBeneficiries.approvedBeneficiaries.length - 1]
    return beneficairyDetails;
}

export const getPendingPayrolllBeneficiries = async () => {
    const fileData = await Action.ReadFileContent("/apps/cxt-web-bb-e2e/test/data/test.json");
    const pendingBeneficiries = JSON.parse(fileData);
    const beneficairyDetails = pendingBeneficiries.approvedBeneficiaries[pendingBeneficiries.approvedBeneficiaries.length - 1]
    return beneficairyDetails;
}

export const getPendingExecutivePayrolllBeneficiries = async () => {
    const fileData = await Action.ReadFileContent("/apps/cxt-web-bb-e2e/test/data/test.json");
    const pendingBeneficiries = JSON.parse(fileData);
    const beneficairyDetails = pendingBeneficiries.approvedBeneficiaries[pendingBeneficiries.approvedBeneficiaries.length - 1]
    return beneficairyDetails;
}

export const saveBeneficiaryDetails = async (beneficiaries, beneficiaryType: string) => {
    for (const obj of beneficiaries) {
        await Action.writeOrAppendJSONFile("/test/data/test.json", camelCaseString(beneficiaryType), beneficiaries);
    }
}

export const getNigel = () => {
    return "done"
}