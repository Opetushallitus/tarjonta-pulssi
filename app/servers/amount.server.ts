import { Pool } from "pg";

import { getCurrentAmountDataFromDb, getHistoryDataFromDb } from "~/functions/pulssiDbAccessor";
import { DEFAULT_DB_POOL_PARAMS } from "~/shared/dbUtils";
import data_current from "~/shared/testdata/pulssi.json";
import data_with_history from "~/shared/testdata/pulssi_with_history.json";

const localPulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getCurrentAmountData = async () => {
  switch (process.env.DATABASE) {
    case "file":
      return data_current;
    case "local":
      return await getCurrentAmountDataFromDb(localPulssiDbPool);
    default: {
      const results = await fetch(process.env.DB_API_URL || "");
      const jsonResult = await results.json();
      return jsonResult;
    }
  }
};

export const getHistoryAmountData = async (startStr: string | null, endStr: string | null) => {
  switch (process.env.DATABASE) {
    case "file":
      return { ...data_with_history, minAikaleima: "26.10.2022 00:00 +02" };
    case "local":
      return await getHistoryDataFromDb(
        localPulssiDbPool,
        startStr ?? undefined,
        endStr ?? undefined
      );
    default: {
      let params = { history: "true " };
      params = startStr !== null ? Object.assign(params, { start: startStr }) : params;
      params = endStr !== null ? Object.assign(params, { end: endStr }) : params;
      const url = `${process.env.DB_API_URL || ""}?${new URLSearchParams(params).toString()}`;
      const results = await fetch(url);
      return await results.json();
    }
  }
};
