import { format, isBefore } from "date-fns";
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
  EntityDatabaseResults,
  EntityPlural,
  EntityType,
  PulssiData,
  SubEntitiesByEntitiesByTila,
  SubEntityAmounts,
} from "~/shared/types";

import {
  getCurrentPulssiAmounts,
  queryPulssiAmounts,
  queryPulssiAmountsHistory,
  queryAllSubentityTypesByEntityTypes,
} from "./amountDbUtils";

export const getCurrentAmountDataFromDb = async (dbPool: Pool) => {
  const pulssiData = {
    koulutukset: await getCurrentPulssiAmounts(dbPool, "koulutus"),
    toteutukset: await getCurrentPulssiAmounts(dbPool, "toteutus"),
    hakukohteet: await getCurrentPulssiAmounts(dbPool, "hakukohde"),
    haut: await getCurrentPulssiAmounts(dbPool, "haku"),
  };
  return pulssiData;
};

const queryEntityHistoryAmounts = async (dbPool: Pool, pointOfTime: Date | null) => {
  return {
    koulutukset: await queryPulssiAmountsHistory(dbPool, "koulutus", pointOfTime),
    toteutukset: await queryPulssiAmountsHistory(dbPool, "toteutus", pointOfTime),
    hakukohteet: await queryPulssiAmountsHistory(dbPool, "hakukohde", pointOfTime),
    haut: await queryPulssiAmountsHistory(dbPool, "haku", pointOfTime),
  };
};

const getCurrentAmountDataForMissingHistoryAmounts = async (
  dbPool: Pool,
  missingHistoryAmounts: SubEntitiesByEntitiesByTila,
  cachedData: EntityDatabaseResults = EMPTY_DATABASE_RESULTS
) => {
  const amountsMissingFor = (amounts: SubEntityAmounts) =>
    amounts.julkaistu.length > 0 || amounts.arkistoitu.length > 0;
  const getDbResults = async (entity: EntityType, cachedDataKey: EntityPlural) =>
    cachedData[cachedDataKey].length > 0
      ? cachedData[cachedDataKey]
      : await queryPulssiAmounts(dbPool, entity);
  return {
    koulutukset: amountsMissingFor(missingHistoryAmounts.koulutukset)
      ? await getDbResults("koulutus", "koulutukset")
      : [],
    toteutukset: amountsMissingFor(missingHistoryAmounts.toteutukset)
      ? await getDbResults("toteutus", "toteutukset")
      : [],
    hakukohteet: amountsMissingFor(missingHistoryAmounts.hakukohteet)
      ? await getDbResults("hakukohde", "hakukohteet")
      : [],
    haut: amountsMissingFor(missingHistoryAmounts.haut) ? await getDbResults("haku", "haut") : [],
  };
};

const combineHistoryAndCurrentAmounts = (
  historyData: EntityDatabaseResults,
  currentData: EntityDatabaseResults,
  subEntitiesMissingFromHistory: SubEntitiesByEntitiesByTila,
  timeLimit: Date | null
) => ({
  koulutukset: [
    historyData.koulutukset,
    findMissingHistoryAmountsForEntity(
      subEntitiesMissingFromHistory.koulutukset,
      currentData.koulutukset
    ),
  ]
    .flat()
    .map((k) => discardAmountsWhenOutOfTimelimit(k, timeLimit)),
  toteutukset: [
    historyData.toteutukset,
    findMissingHistoryAmountsForEntity(
      subEntitiesMissingFromHistory.toteutukset,
      currentData.toteutukset
    ),
  ]
    .flat()
    .map((k) => discardAmountsWhenOutOfTimelimit(k, timeLimit)),
  hakukohteet: [
    historyData.hakukohteet,
    findMissingHistoryAmountsForEntity(
      subEntitiesMissingFromHistory.hakukohteet,
      currentData.hakukohteet
    ),
  ]
    .flat()
    .map((k) => discardAmountsWhenOutOfTimelimit(k, timeLimit)),
  haut: [
    historyData.haut,
    findMissingHistoryAmountsForEntity(subEntitiesMissingFromHistory.haut, currentData.haut),
  ]
    .flat()
    .map((k) => discardAmountsWhenOutOfTimelimit(k, timeLimit)),
});

export const getHistoryDataFromDb = async (dbPool: Pool, startStr?: string, endStr?: string) => {
  const referenceDate = new Date();
  const start = parseDate(startStr, referenceDate);
  const end = parseDate(endStr, referenceDate);

  const allSubentitiesByEntities = await queryAllSubentityTypesByEntityTypes(dbPool);

  const entityAmountsAtStart = await queryEntityHistoryAmounts(dbPool, start);

  const missingHistoryAmountsAtStart = resolveMissingSubentities(
    allSubentitiesByEntities,
    entityAmountsAtStart
  );
  const currentAmountDataForStart = await getCurrentAmountDataForMissingHistoryAmounts(
    dbPool,
    missingHistoryAmountsAtStart
  );

  const completeEntityAmountsAtStart = combineHistoryAndCurrentAmounts(
    entityAmountsAtStart,
    currentAmountDataForStart,
    missingHistoryAmountsAtStart,
    start
  );

  // Jos loppuaikaa ei ole annettu, haetaan lukemat aina current datasta
  const entityAmountsAtEnd = end
    ? await queryEntityHistoryAmounts(dbPool, end)
    : EMPTY_DATABASE_RESULTS;

  const missingHistoryAmountsAtEnd = resolveMissingSubentities(
    allSubentitiesByEntities,
    entityAmountsAtEnd
  );

  const currentAmountDataForEnd = await getCurrentAmountDataForMissingHistoryAmounts(
    dbPool,
    missingHistoryAmountsAtEnd,
    currentAmountDataForStart
  );

  const completeEntityAmountsAtEnd = combineHistoryAndCurrentAmounts(
    entityAmountsAtEnd,
    currentAmountDataForEnd,
    missingHistoryAmountsAtEnd,
    end
  );

  const returnValue: PulssiData = {
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
  };
  const minAikaleima = [
    entityAmountsAtStart.koulutukset,
    entityAmountsAtStart.toteutukset,
    entityAmountsAtStart.hakukohteet,
    entityAmountsAtStart.haut,
  ]
    .flat()
    .reduce((prev, curr) =>
      isBefore(prev.start_timestamp, curr.start_timestamp) ? prev : curr
    ).start_timestamp;
  returnValue.minAikaleima = format(minAikaleima, DATETIME_FORMAT_TZ);
  return returnValue;
};
