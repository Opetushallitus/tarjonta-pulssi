import data from '../../test_data/pulssi.json';
import data2 from '../../test_data/pulssi2.json';
import type { PulssiData } from './types';
import { DEFAULT_DB_POOL_PARAMS } from '../../../../../cdk/lambda/dbUtils';
import { Pool } from "pg";
import { getPulssiAmounts, getPulssiHistoryAmounts } from './amountDbUtils';
//import { Api } from 'sst/node/api';

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  port: 5432,
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getAmountDataFromTestFile = async (test: boolean) => {
  //const results = await fetch(Api.api.url);
  //console.log(await results.text());
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

