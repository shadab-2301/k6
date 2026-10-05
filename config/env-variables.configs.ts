require("dotenv").config();
import { getUiBaseUrlForTier } from "../helper/environment-handler";

export const baseUrl = {
  STG: getUiBaseUrlForTier("STG"),
  TST: getUiBaseUrlForTier("TST"),
  DEV: getUiBaseUrlForTier("DEV"),
};
