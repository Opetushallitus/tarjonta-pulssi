import { format } from "date-fns";
import type { Pool } from "pg";

import {
  EMPTY_DATABASE_RESULTS,
  dbQueryResultToPulssiData,
  discardAmountsWhenOutOfTimelimit,
  findMissingHistoryAmountsForEntity,
  parseDate,
  resolveMissingSubentities,
} from "~/shared/amountDataUtils";
import { DATETIME_FORMAT_TZ } from "~/shared/constants";
import type {
  DatabaseRow,
  EntityDatabaseResults,
  EntityPlural,
  EntityType,
  SubEntitiesByEntities,
  SubEntitiesByEntitiesByTila,
  SubEntityAmounts,
} from "~/shared/types";

import {
  getCurrentPulssiAmounts,
  queryPulssiAmounts,
  queryPulssiAmountsHistory,
  queryAllSubentityTypesByEntityTypes,
} from "./amountDbUtils";

async function allPromiseVals<K extends string, T>(obj: Record<K, Promise<T>>) {
  const vals = await Promise.all(Object.values(obj));
  return Object.fromEntries(Object.keys(obj).map((k, i) => [k, vals[i]])) as Record<K, T>;
}

export const getCurrentAmountDataFromDb = async (dbPool: Pool) => {
  return allPromiseVals({
    koulutukset: getCurrentPulssiAmounts(dbPool, "koulutus"),
    toteutukset: getCurrentPulssiAmounts(dbPool, "toteutus"),
    hakukohteet: getCurrentPulssiAmounts(dbPool, "hakukohde"),
    haut: getCurrentPulssiAmounts(dbPool, "haku"),
  });
};

const queryEntityHistoryAmounts = async (dbPool: Pool, pointOfTime: Date | null) => {
  return allPromiseVals({
    koulutukset: queryPulssiAmountsHistory(dbPool, "koulutus", pointOfTime),
    toteutukset: queryPulssiAmountsHistory(dbPool, "toteutus", pointOfTime),
    hakukohteet: queryPulssiAmountsHistory(dbPool, "hakukohde", pointOfTime),
    haut: queryPulssiAmountsHistory(dbPool, "haku", pointOfTime),
  });
};

const amountsMissingFor = (amounts: SubEntityAmounts) =>
  amounts.julkaistu.length > 0 || amounts.arkistoitu.length > 0;

const getCurrentAmountDataForMissingHistoryAmounts = async (
  dbPool: Pool,
  missingHistoryAmounts: SubEntitiesByEntitiesByTila,
  cachedData: EntityDatabaseResults = EMPTY_DATABASE_RESULTS
) => {
  const getDbResults = async (entity: EntityType, cachedDataKey: EntityPlural) => {
    if (amountsMissingFor(missingHistoryAmounts[cachedDataKey])) {
      return cachedData[cachedDataKey].length > 0
        ? cachedData[cachedDataKey]
        : await queryPulssiAmounts(dbPool, entity);
    }
    return [];
  };

  return allPromiseVals({
    koulutukset: getDbResults("koulutus", "koulutukset"),
    toteutukset: getDbResults("toteutus", "toteutukset"),
    hakukohteet: getDbResults("hakukohde", "hakukohteet"),
    haut: getDbResults("haku", "haut"),
  });
};

const combineHistoryAmountsForEntity = (
  historyData: Array<DatabaseRow>,
  currentData: Array<DatabaseRow>,
  missing: SubEntityAmounts,
  timeLimit: Date | null
) =>
  [historyData, findMissingHistoryAmountsForEntity(missing, currentData)]
    .flat()
    .map((row) => discardAmountsWhenOutOfTimelimit(row, timeLimit));

const getCompleteAmounts = async (
  dbPool: Pool,
  allSubentitiesByEntities: SubEntitiesByEntities,
  historyData: EntityDatabaseResults,
  timeLimit: Date | null
) => {
  const missingHistoryAmounts = resolveMissingSubentities(allSubentitiesByEntities, historyData);

  const currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(
    dbPool,
    missingHistoryAmounts
  );

  return {
    koulutukset: combineHistoryAmountsForEntity(
      historyData.koulutukset,
      currentAmountData.koulutukset,
      missingHistoryAmounts.koulutukset,
      timeLimit
    ),
    toteutukset: combineHistoryAmountsForEntity(
      historyData.toteutukset,
      currentAmountData.toteutukset,
      missingHistoryAmounts.toteutukset,
      timeLimit
    ),
    hakukohteet: combineHistoryAmountsForEntity(
      historyData.hakukohteet,
      currentAmountData.hakukohteet,
      missingHistoryAmounts.hakukohteet,
      timeLimit
    ),
    haut: combineHistoryAmountsForEntity(
      historyData.haut,
      currentAmountData.haut,
      missingHistoryAmounts.haut,
      timeLimit
    ),
  };
};

export const getHistoryDataFromDb = async (dbPool: Pool, startStr?: string, endStr?: string) => {
  const referenceDate = new Date();
  const start = parseDate(startStr, referenceDate);
  const end = parseDate(endStr, referenceDate);

  const [allSubentitiesByEntities, entityAmountsAtStart, entityAmountsAtEnd] = await Promise.all([
    queryAllSubentityTypesByEntityTypes(dbPool),
    queryEntityHistoryAmounts(dbPool, start),
    // Jos loppuaikaa ei ole annettu, haetaan lukemat aina current datasta
    end ? await queryEntityHistoryAmounts(dbPool, end) : Promise.resolve(EMPTY_DATABASE_RESULTS),
  ]);

  const [completeEntityAmountsAtStart, completeEntityAmountsAtEnd] = await Promise.all([
    getCompleteAmounts(dbPool, allSubentitiesByEntities, entityAmountsAtStart, start),
    getCompleteAmounts(dbPool, allSubentitiesByEntities, entityAmountsAtEnd, end),
  ]);

  return {
    koulutukset: dbQueryResultToPulssiData(
      completeEntityAmountsAtEnd.koulutukset,
      "koulutus",
      completeEntityAmountsAtStart.koulutukset
    ),
    toteutukset: dbQueryResultToPulssiData(
      completeEntityAmountsAtEnd.toteutukset,
      "toteutus",
      completeEntityAmountsAtStart.toteutukset
    ),
    hakukohteet: dbQueryResultToPulssiData(
      completeEntityAmountsAtEnd.hakukohteet,
      "hakukohde",
      completeEntityAmountsAtStart.hakukohteet
    ),
    haut: dbQueryResultToPulssiData(
      completeEntityAmountsAtEnd.haut,
      "haku",
      completeEntityAmountsAtStart.haut
    ),
    minAikaleima: format(
      [
        ...entityAmountsAtStart.koulutukset,
        ...entityAmountsAtStart.toteutukset,
        ...entityAmountsAtStart.hakukohteet,
        ...entityAmountsAtStart.haut,
      ].sort((a, b) => (a.start_timestamp < b.start_timestamp ? -1 : 1))?.[0]?.start_timestamp,
      DATETIME_FORMAT_TZ
    ),
  };
};
