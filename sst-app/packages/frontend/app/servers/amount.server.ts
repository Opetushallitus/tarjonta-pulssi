import data_current from '../../../shared/testdata/pulssi.json';
import data_old from '../../../shared/testdata/pulssi_old.json';
import type { PulssiData } from '../../../shared/types';
import { DEFAULT_DB_POOL_PARAMS } from '../../../shared/dbUtils';
import { Pool } from "pg";
import { getCurrentAmountDataFromDb, getHistoryDataFromDb } from '../../../functions/src/pulssiDbAccessor'
import { getCombinedHistoryData } from '../../../shared/amountDataUtils';


const localPulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getCurrentAmountData = async() => {
  switch(process.env.DATABASE) {
    case "file":
      return data_current;
    case "local":
      return await getCurrentAmountDataFromDb(localPulssiDbPool);
    default:
      const results = await fetch(process.env.DB_API_URL || "");
      const jsonResult = await results.json();
      return jsonResult;
  }
}

export const getHistoryAmountData = async (startStr: string, endStr: string) => {
  switch(process.env.DATABASE) {
    case "file":
      return getCombinedHistoryData(data_old as unknown as PulssiData, data_current as unknown as PulssiData )
    case "local":
      return await getHistoryDataFromDb(localPulssiDbPool, startStr, endStr);
    default:
      const url = `${process.env.DB_API_URL || ""}?${new URLSearchParams({ start: startStr, end: endStr}).toString()}`;
      const results = await fetch(url);
      return await results.json();
  }
}