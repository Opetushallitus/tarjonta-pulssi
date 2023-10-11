import data_current from '../../test_data/pulssi.json';
import data_old from '../../test_data/pulssi_old.json';
import type { PulssiData } from '../../../shared/types';
import { DEFAULT_DB_POOL_PARAMS } from '../../../shared/dbUtils';
import { Pool } from "pg";
import { getCurrentAmountDataFromDb, getHistoryDataFromDb } from '../../../functions/src/pulssiDataAccessor'
import { getCombinedHistoryData } from '../../../shared/amountDataUtils';


const localPulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getAmountDataFromTestFile = async (test: boolean) => {
  return test ? getCombinedHistoryData(data_old as unknown as PulssiData, data_current as unknown as PulssiData ) : data_current as unknown as PulssiData;
}

export const getCurrentAmountData = async() => {
  if (process.env.DATABASE === "file") {
    return data_current;
  }
  const dbApiUrl = process.env.DB_API_URL || "";
  console.log("!!!!!!!!!!!!!!!!!!!! " + dbApiUrl);
  const results = await fetch(dbApiUrl);
  console.log( await results.text());
  //return await getCurrentAmountDataFromDb(localPulssiDbPool);
  return data_current;
}

export const getHistoryAmountData = async (start: Date | null, end: Date | null) => {
  if (process.env.DATABASE === "file") {
    return getCombinedHistoryData(data_old as unknown as PulssiData, data_current as unknown as PulssiData )
  }
  //return await getHistoryDataFromDb(localPulssiDbPool, start, end);
  return getCombinedHistoryData(data_old as unknown as PulssiData, data_current as unknown as PulssiData );
}
