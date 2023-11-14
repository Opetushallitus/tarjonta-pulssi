import { Pool } from "pg";

import { getCurrentAmountDataFromDb, getHistoryDataFromDb } from "~/functions/pulssiDbAccessor";
import { DEFAULT_DB_POOL_PARAMS } from "~/shared/dbUtils";

const localPulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getCurrentAmountDataFromLocaldb = async () => {
  return await getCurrentAmountDataFromDb(localPulssiDbPool);
};

export const getHistoryAmountDataFromLocaldb = async (
  startStr: string | null,
  endStr: string | null
) => {
  return await getHistoryDataFromDb(localPulssiDbPool, startStr ?? undefined, endStr ?? undefined);
};
