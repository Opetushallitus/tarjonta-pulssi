import type { Pool } from "pg";
import { getCurrentPulssiAmounts, queryPulssiAmounts, queryPulssiAmountsAtCertainMoment, queryAllSubentityTypesByEntityTypes } from "./amountDbUtils";
import { EMPTY_DATABASE_RESULTS, dbQueryResultToPulssiData, findMissingHistoryAmountsForEntity, getCombinedHistoryData, parseDate, resolveMissingAmounts } from "../../shared/amountDataUtils";
import type { DatabaseRow, EntityPlural, EntityType, SubEntitiesByEntitiesByTila, SubEntityAmounts } from "../../shared/types";
import { DATETIME_FORMAT } from "../../shared/constants";
import { format, parse, add } from "date-fns";


export const getCurrentAmountDataFromDb = async (dbPool: Pool) => {
  const pulssiData = {
    koulutukset: await getCurrentPulssiAmounts(dbPool, "koulutus"),
    toteutukset: await getCurrentPulssiAmounts(dbPool, "toteutus"),
    hakukohteet: await getCurrentPulssiAmounts(dbPool, "hakukohde"),
    haut: await getCurrentPulssiAmounts(dbPool, "haku"),
  };
  return pulssiData;
}

const getCurrentAmountDataForMissingHistoryAmounts = async (dbPool: Pool, missingHistoryAmounts: SubEntitiesByEntitiesByTila, cachedData: Record<EntityPlural , Array<DatabaseRow>> = EMPTY_DATABASE_RESULTS) => {
  const missingAmounts = (amounts: SubEntityAmounts) => amounts.julkaistu.length > 0 || amounts.arkistoitu.length > 0
  const getDbResults = async (entity: EntityType, cachedDataKey: EntityPlural) => 
    cachedData[cachedDataKey].length > 0 ? cachedData[cachedDataKey] : await queryPulssiAmounts(dbPool, entity)
  return {
    koulutukset: missingAmounts(missingHistoryAmounts.koulutukset) ? await getDbResults("koulutus", "koulutukset") : [],
    toteutukset: missingAmounts(missingHistoryAmounts.toteutukset) ? await getDbResults("toteutus", "toteutukset") : [],
    hakukohteet: missingAmounts(missingHistoryAmounts.hakukohteet) ? await getDbResults("hakukohde", "hakukohteet") : [],
    haut: missingAmounts(missingHistoryAmounts.haut) ? await getDbResults("haku", "haut") : [],
  }
}

const toUtcString = (date: Date | null) => 
  date !== null ? format(add(date, { hours: (date.getTimezoneOffset() / 60)}), DATETIME_FORMAT) : null;

export const getHistoryDataFromDb = async (dbPool: Pool, startStr: string | undefined, endStr: string | undefined) => {
  const referenceData = new Date();
  const start = parseDate(startStr, referenceData);
  const dbStartTime = toUtcString(start);
  let koulutukset = await queryPulssiAmountsAtCertainMoment(dbPool, "koulutus", dbStartTime);
  let toteutukset = await queryPulssiAmountsAtCertainMoment(dbPool, "toteutus", dbStartTime);
  let hakukohteet = await queryPulssiAmountsAtCertainMoment(dbPool, "hakukohde", dbStartTime);
  let haut = await queryPulssiAmountsAtCertainMoment(dbPool, "haku", dbStartTime);

  const allSubentitiesByEntities = await queryAllSubentityTypesByEntityTypes(dbPool);
  let missingHistoryAmounts = resolveMissingAmounts(allSubentitiesByEntities, koulutukset, toteutukset, hakukohteet, haut);
  let currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(dbPool, missingHistoryAmounts);

  const pulssiAmountsAtStart = {
    koulutukset: dbQueryResultToPulssiData(koulutukset.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.koulutukset, currentAmountData.koulutukset)), "koulutus", start),
    toteutukset: dbQueryResultToPulssiData(toteutukset.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.toteutukset, currentAmountData.toteutukset)), "toteutus", start),
    hakukohteet: dbQueryResultToPulssiData(hakukohteet.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.hakukohteet, currentAmountData.hakukohteet)), "hakukohde", start),
    haut: dbQueryResultToPulssiData(haut.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.haut, currentAmountData.haut)), "haku", start),
  };

  const end = parseDate(endStr, referenceData);
  const dbEndTime = toUtcString(end); // Jos loppuaikaa ei ole annettu, haetaan lukemat current datasta
  koulutukset = dbEndTime ? await queryPulssiAmountsAtCertainMoment(dbPool, "koulutus", dbEndTime) : [];
  toteutukset = dbEndTime ? await queryPulssiAmountsAtCertainMoment(dbPool, "toteutus", dbEndTime) : [];
  hakukohteet = dbEndTime ? await queryPulssiAmountsAtCertainMoment(dbPool, "hakukohde", dbEndTime) : [];
  haut = dbEndTime ? await queryPulssiAmountsAtCertainMoment(dbPool, "haku", dbEndTime) : [];
  missingHistoryAmounts = resolveMissingAmounts(allSubentitiesByEntities, koulutukset, toteutukset, hakukohteet, haut);
  currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(dbPool, missingHistoryAmounts, currentAmountData);

  const pulssiAmountsAtEnd = {
    koulutukset: dbQueryResultToPulssiData(koulutukset.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.koulutukset, currentAmountData.koulutukset)), "koulutus", end),
    toteutukset: dbQueryResultToPulssiData(toteutukset.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.toteutukset, currentAmountData.toteutukset)), "toteutus", end),
    hakukohteet: dbQueryResultToPulssiData(hakukohteet.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.hakukohteet, currentAmountData.hakukohteet)), "hakukohde", end),
    haut: dbQueryResultToPulssiData(haut.concat(findMissingHistoryAmountsForEntity(missingHistoryAmounts.haut, currentAmountData.haut)), "haku", end),
  };

  const returnValue = getCombinedHistoryData(pulssiAmountsAtStart, pulssiAmountsAtEnd);
  return returnValue;
}
