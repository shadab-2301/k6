import Action from "../../../../helper/actions";


export const getUserDetails = async () => {
    const fileData = await Action.ReadFileContent("/test/data/test.json");
    const previousUser = JSON.parse(fileData);
    const userInfo = previousUser.users[previousUser.users.length - 1]
    return userInfo;
}