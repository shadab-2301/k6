import Action from "../../../../helper/actions";


export const saveRTPDetails = async (paymentDetails) => {
    await Action.writeOrAppendJSONFile("/test/data/test.json", "rtpDetails", paymentDetails);
}

export const getRTPReceiptDetails = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const pendingBeneficiries = JSON.parse(fileData);
    const beneficairyDetails = pendingBeneficiries.domesticBeneficiaries[pendingBeneficiries.domesticBeneficiaries.length - 1]
    return beneficairyDetails;
}

