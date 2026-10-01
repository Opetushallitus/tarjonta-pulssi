// pg on CJS-paketti, jonka nimettyjä exportteja Noden ESM-tulkinta ei tunnista.
// Sama kiertotie kuin shared/db/umzug/migrate.ts:ssä.
import pg from "pg";

import { getCurrentAmountDataFromDb, getHistoryDataFromDb } from "~/functions/pulssiDbAccessor";
import { DEFAULT_DB_POOL_PARAMS } from "~/shared/dbUtils";

const { Pool } = pg;

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
