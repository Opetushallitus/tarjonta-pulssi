import { format, isBefore } from "date-fns";
import type { Pool } from "pg";

import {
  EMPTY_DATABASE_RESULTS,
  dbQueryResultToPulssiData,
  findMissingHistoryAmountsForEntity,
  getCombinedHistoryData,
  parseDate,
  resolveMissingAmounts,
} from "~/shared/amountDataUtils";
import { DATETIME_FORMAT_TZ } from "~/shared/constants";
import type {
  DatabaseRow,
  EntityPlural,
  EntityType,
  SubEntitiesByEntitiesByTila,
  SubEntityAmounts,
} from "~/shared/types";

import {
  getCurrentPulssiAmounts,
  queryPulssiAmounts,
  queryPulssiAmountsAtCertainMoment,
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

const getCurrentAmountDataForMissingHistoryAmounts = async (
  dbPool: Pool,
  missingHistoryAmounts: SubEntitiesByEntitiesByTila,
  cachedData: Record<EntityPlural, Array<DatabaseRow>> = EMPTY_DATABASE_RESULTS
) => {
  const missingAmounts = (amounts: SubEntityAmounts) =>
    amounts.julkaistu.length > 0 || amounts.arkistoitu.length > 0;
  const getDbResults = async (entity: EntityType, cachedDataKey: EntityPlural) =>
    cachedData[cachedDataKey].length > 0
      ? cachedData[cachedDataKey]
      : await queryPulssiAmounts(dbPool, entity);
  return {
    koulutukset: missingAmounts(missingHistoryAmounts.koulutukset)
      ? await getDbResults("koulutus", "koulutukset")
      : [],
    toteutukset: missingAmounts(missingHistoryAmounts.toteutukset)
      ? await getDbResults("toteutus", "toteutukset")
      : [],
    hakukohteet: missingAmounts(missingHistoryAmounts.hakukohteet)
      ? await getDbResults("hakukohde", "hakukohteet")
      : [],
    haut: missingAmounts(missingHistoryAmounts.haut) ? await getDbResults("haku", "haut") : [],
  };
};

export const getHistoryDataFromDb = async (
  dbPool: Pool,
  startStr: string | undefined,
  endStr: string | undefined
) => {
  const referenceDate = new Date();
  const start = parseDate(startStr, referenceDate);
  const end = parseDate(endStr, referenceDate);

  let koulutukset = await queryPulssiAmountsAtCertainMoment(dbPool, "koulutus", start);
  let toteutukset = await queryPulssiAmountsAtCertainMoment(dbPool, "toteutus", start);
  let hakukohteet = await queryPulssiAmountsAtCertainMoment(dbPool, "hakukohde", start);
  let haut = await queryPulssiAmountsAtCertainMoment(dbPool, "haku", start);

  const allSubentitiesByEntities = await queryAllSubentityTypesByEntityTypes(dbPool);
  let missingHistoryAmounts = resolveMissingAmounts(
    allSubentitiesByEntities,
    koulutukset,
    toteutukset,
    hakukohteet,
    haut
  );
  let currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(
    dbPool,
    missingHistoryAmounts
  );

  const pulssiAmountsAtStart = {
    koulutukset: dbQueryResultToPulssiData(
      koulutukset.concat(
        findMissingHistoryAmountsForEntity(
          missingHistoryAmounts.koulutukset,
          currentAmountData.koulutukset
        )
      ),
      "koulutus",
      start
    ),
    toteutukset: dbQueryResultToPulssiData(
      toteutukset.concat(
        findMissingHistoryAmountsForEntity(
          missingHistoryAmounts.toteutukset,
          currentAmountData.toteutukset
        )
      ),
      "toteutus",
      start
    ),
    hakukohteet: dbQueryResultToPulssiData(
      hakukohteet.concat(
        findMissingHistoryAmountsForEntity(
          missingHistoryAmounts.hakukohteet,
          currentAmountData.hakukohteet
        )
      ),
      "hakukohde",
      start
    ),
    haut: dbQueryResultToPulssiData(
      haut.concat(
        findMissingHistoryAmountsForEntity(missingHistoryAmounts.haut, currentAmountData.haut)
      ),
      "haku",
      start
    ),
  };

  const minAikaleima = [koulutukset, toteutukset, hakukohteet, haut]
    .flat()
    .reduce((prev, curr) =>
      isBefore(prev.start_timestamp, curr.start_timestamp) ? prev : curr
    ).start_timestamp;

  koulutukset = end ? await queryPulssiAmountsAtCertainMoment(dbPool, "koulutus", end) : [];
  toteutukset = end ? await queryPulssiAmountsAtCertainMoment(dbPool, "toteutus", end) : [];
  hakukohteet = end ? await queryPulssiAmountsAtCertainMoment(dbPool, "hakukohde", end) : [];
  haut = end ? await queryPulssiAmountsAtCertainMoment(dbPool, "haku", end) : [];
  missingHistoryAmounts = resolveMissingAmounts(
    allSubentitiesByEntities,
    koulutukset,
    toteutukset,
    hakukohteet,
    haut
  );
  currentAmountData = await getCurrentAmountDataForMissingHistoryAmounts(
    dbPool,
    missingHistoryAmounts,
    currentAmountData
  );

  const pulssiAmountsAtEnd = {
    koulutukset: dbQueryResultToPulssiData(
      koulutukset.concat(
        findMissingHistoryAmountsForEntity(
          missingHistoryAmounts.koulutukset,
          currentAmountData.koulutukset
        )
      ),
      "koulutus",
      end
    ),
    toteutukset: dbQueryResultToPulssiData(
      toteutukset.concat(
        findMissingHistoryAmountsForEntity(
          missingHistoryAmounts.toteutukset,
          currentAmountData.toteutukset
        )
      ),
      "toteutus",
      end
    ),
    hakukohteet: dbQueryResultToPulssiData(
      hakukohteet.concat(
        findMissingHistoryAmountsForEntity(
          missingHistoryAmounts.hakukohteet,
          currentAmountData.hakukohteet
        )
      ),
      "hakukohde",
      end
    ),
    haut: dbQueryResultToPulssiData(
      haut.concat(
        findMissingHistoryAmountsForEntity(missingHistoryAmounts.haut, currentAmountData.haut)
      ),
      "haku",
      end
    ),
  };

  const returnValue = getCombinedHistoryData(pulssiAmountsAtStart, pulssiAmountsAtEnd);
  returnValue.minAikaleima = format(minAikaleima, DATETIME_FORMAT_TZ);
  return returnValue;
};
