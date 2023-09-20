import data from '../../../../app/test_data/pulssi.json';
import data2 from '../../../../app/test_data/pulssi2.json';
import type { PulssiData } from './types';
import { DEFAULT_DB_POOL_PARAMS } from '../../../../cdk/lambda/dbUtils';
import { Pool } from "pg";
import { getPulssiAmounts, getPulssiHistoryAmounts } from './amountDbUtils';

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  port: 5432,
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getAmountDataFromTestFile = (test: boolean): PulssiData => {
  return test ? data as unknown as PulssiData : data2 as unknown as PulssiData;
}

export const getCurrentAmountDataFromDb = async () => {
  const pulssiData = {
    koulutukset: await getPulssiAmounts(pulssiDbPool, "koulutus"),
    toteutukset: await getPulssiAmounts(pulssiDbPool, "toteutus"),
    hakukohteet: await getPulssiAmounts(pulssiDbPool, "hakukohde"),
    haut: await getPulssiAmounts(pulssiDbPool, "haku"),
  };
  return pulssiData;
}

export const getHistoryDataFromDb = async (start: string, end: string) => {
  const pulssiData = {
    koulutukset: await getPulssiHistoryAmounts(pulssiDbPool, "koulutus", start, end),
    toteutukset: await getPulssiHistoryAmounts(pulssiDbPool, "toteutus", start, end),
    hakukohteet: await getPulssiHistoryAmounts(pulssiDbPool, "hakukohde", start, end),
    haut: await getPulssiHistoryAmounts(pulssiDbPool, "haku", start, end),
  };
  return pulssiData;
}

