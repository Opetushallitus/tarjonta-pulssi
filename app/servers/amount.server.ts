import { getCurrentAmountDataFromAws, getHistoryAmountDataFromAws } from "./amount.aws.server";
import {
  getCurrentAmountDataFromLocaldb,
  getHistoryAmountDataFromLocaldb,
} from "./amount.localdb.server";
import {
  getCurrentAmountDataFromLocalfile,
  getHistoryAmountDataFromLocalfile,
} from "./amount.localfile.server";

export const getCurrentAmountData = async () => {
  switch (process.env.DATABASE) {
    case "file":
      return await getCurrentAmountDataFromLocalfile();
    case "local":
      return await getCurrentAmountDataFromLocaldb();
    default: {
      return await getCurrentAmountDataFromAws();
    }
  }
};

export const getHistoryAmountData = async (startStr: string | null, endStr: string | null) => {
  switch (process.env.DATABASE) {
    case "file":
      return getHistoryAmountDataFromLocalfile(startStr, endStr);
    case "local":
      return await getHistoryAmountDataFromLocaldb(startStr, endStr);
    default: {
      return await getHistoryAmountDataFromAws(startStr, endStr);
    }
  }
};
