import data2 from '../../test_data/pulssi2.json';
import data_old from '../../test_data/pulssi_old.json';
import { EMPTY_DATABASE_RESULTS } from './types';
import type { EntityPlural, SubEntitiesByEntitiesByTila, SubEntityAmounts, DatabaseRow, PulssiData } from './types';
import { DEFAULT_DB_POOL_PARAMS } from '../../../shared/dbUtils';
import { Pool } from "pg";
import { getCurrentPulssiAmounts, queryMeasuredSubEntityTypesByEntityTypes as queryAllSubentityTypesByEntityTypes, queryPulssiAmountsAtCertainMoment, queryPulssiAmounts } from './amountDbUtils';
import { dbQueryResultToPulssiData, findMissingHistoryAmountsForEntity, getCombinedHistoryData, resolveMissingAmounts } from './amountDataUtils';
import type { EntityType } from '../../../shared/types';

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

export const getAmountDataFromTestFile = async (test: boolean) => {
  //const results = await fetch(process.env.DB_API_URL || "");
  //console.log(await results.text());
  return test ? getCombinedHistoryData(data_old as unknown as PulssiData, data2 as unknown as PulssiData ) : data2 as unknown as PulssiData;
}

export const getCurrentAmountDataFromDb = async () => {
  const pulssiData = {
    koulutukset: await getCurrentPulssiAmounts(pulssiDbPool, "koulutus"),
    toteutukset: await getCurrentPulssiAmounts(pulssiDbPool, "toteutus"),
    hakukohteet: await getCurrentPulssiAmounts(pulssiDbPool, "hakukohde"),
    haut: await getCurrentPulssiAmounts(pulssiDbPool, "haku"),
  };
  return pulssiData;
}

const getCurrentAmountDataForMissingHistoryAmounts = async (missingHistoryAmounts: SubEntitiesByEntitiesByTila, cachedData: Record<EntityPlural , Array<DatabaseRow>> = EMPTY_DATABASE_RESULTS) => {
  const missingAmounts = (amounts: SubEntityAmounts) => amounts.julkaistu.length === 0 || amounts.arkistoitu.length === 0
  const getDbResults = async (entity: EntityType, cachedDataKey: EntityPlural) => 
    cachedData[cachedDataKey].length > 0 ? cachedData[cachedDataKey] : await queryPulssiAmounts(pulssiDbPool, entity)
  return {
    koulutukset: missingAmounts(missingHistoryAmounts.koulutukset) ? await getDbResults("koulutus", "koulutukset") : [],
    toteutukset: missingAmounts(missingHistoryAmounts.toteutukset) ? await getDbResults("toteutus", "toteutukset") : [],
    hakukohteet: missingAmounts(missingHistoryAmounts.hakukohteet) ? await getDbResults("hakukohde", "hakukohteet") : [],
    haut: missingAmounts(missingHistoryAmounts.haut) ? await getDbResults("haku", "haut") : [],
  }
}

export const getHistoryDataFromDb = async (start: string, end: string) => {
  let koulutukset = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "koulutus", start);
  let toteutukset = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "toteutus", start);
  let hakukohteet = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "hakukohde", start);
  let haut = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "haku", start);

  const allSubentitiesByEntities = await queryAllSubentityTypesByEntityTypes(pulssiDbPool);
  let missingHistoryAmounts = resolveMissingAmounts(allSubentitiesByEntities, koulutukset, toteutukset, hakukohteet, haut);
  let currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(missingHistoryAmounts);

  const pulssiAmountsAtStart = {
    koulutukset: dbQueryResultToPulssiData(koulutukset.concat(findMissingHistoryAmountsForEntity("koulutus", missingHistoryAmounts.koulutukset, currentAmountData.koulutukset)), "koulutus", start),
    toteutukset: dbQueryResultToPulssiData(toteutukset.concat(findMissingHistoryAmountsForEntity("toteutus", missingHistoryAmounts.toteutukset, currentAmountData.toteutukset)), "toteutus", start),
    hakukohteet: dbQueryResultToPulssiData(hakukohteet.concat(findMissingHistoryAmountsForEntity("hakukohde", missingHistoryAmounts.hakukohteet, currentAmountData.hakukohteet)), "hakukohde", start),
    haut: dbQueryResultToPulssiData(haut.concat(findMissingHistoryAmountsForEntity("haku", missingHistoryAmounts.haut, currentAmountData.haut)), "haku", start),
  };

  koulutukset = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "koulutus", end);
  toteutukset = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "toteutus", end);
  hakukohteet = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "hakukohde", end);
  haut = await queryPulssiAmountsAtCertainMoment(pulssiDbPool, "haku", end);
  missingHistoryAmounts = resolveMissingAmounts(allSubentitiesByEntities, koulutukset, toteutukset, hakukohteet, haut);
  currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(missingHistoryAmounts, currentAmountData);

  const pulssiAmountsAtEnd = {
    koulutukset: dbQueryResultToPulssiData(koulutukset.concat(findMissingHistoryAmountsForEntity("koulutus", missingHistoryAmounts.koulutukset, currentAmountData.koulutukset)), "koulutus", end),
    toteutukset: dbQueryResultToPulssiData(toteutukset.concat(findMissingHistoryAmountsForEntity("toteutus", missingHistoryAmounts.toteutukset, currentAmountData.toteutukset)), "toteutus", end),
    hakukohteet: dbQueryResultToPulssiData(hakukohteet.concat(findMissingHistoryAmountsForEntity("hakukohde", missingHistoryAmounts.hakukohteet, currentAmountData.hakukohteet)), "hakukohde", end),
    haut: dbQueryResultToPulssiData(haut.concat(findMissingHistoryAmountsForEntity("haku", missingHistoryAmounts.haut, currentAmountData.haut)), "haku", end),
  };
  return getCombinedHistoryData(pulssiAmountsAtStart, pulssiAmountsAtEnd);
}

