import { expect } from "@playwright/test"
import ApolloModal from "../pages/popup-modal-page"

export const verifyModal = async (action: string) => {
    new ApolloModal();
    expect(await ApolloModal.getModalHeading().textContent()).toEqual(`Cancel ${action}?`)
    expect((await ApolloModal.getModalMainMessage().textContent())?.trim()).toEqual(`You are about to cancel ${action}.  Are you sure you want to cancel?`)
    expect(await ApolloModal.getModalActionConfirmationButton("Yes")).toBeEnabled();
    expect(await ApolloModal.getModalActionDeclineButton("No")).toBeEnabled();
}