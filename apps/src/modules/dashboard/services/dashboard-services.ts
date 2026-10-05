import Action from "../../../../helper/actions";

export const getSelectedProfile = async (): Promise<string> => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const data = JSON.parse(fileData);
    const profile = data.profiles[data.profiles.length - 1]
    return profile.selectedProfile;
}