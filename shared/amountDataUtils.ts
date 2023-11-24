import { parse, isAfter } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { findLastIndex } from "lodash";
import { P, match } from "ts-pattern";

import { DATETIME_FORMAT_TZ, DEFAULT_TIMEZONE } from "./constants";
import type {
  DatabaseRow,
  EntityType,
  SubEntitiesByEntities,
  SubEntityAmounts,
  Julkaisutila,
  SubKeyWithAmounts,
  EntityDatabaseResults,
} from "./types";

export const EMPTY_DATABASE_RESULTS = {
  koulutukset: [],
  toteutukset: [],
  hakukohteet: [],
  haut: [],
};

const sumBy = (
  tilaFilterValue: Julkaisutila,
  amountFieldName: keyof DatabaseRow,
  rows?: Array<DatabaseRow>
) =>
  rows
    ? rows.reduce((result, row) => {
        const amountValue = Number(row[amountFieldName]);
        const addedValue =
          row.tila === tilaFilterValue && !Number.isNaN(amountValue) ? amountValue : 0;
        return result + addedValue;
      }, 0)
    : undefined;

export const sumUp = (number1?: number, number2?: number) => {
  return match([number1, number2])
    .with([P.not(P.nullish), P.not(P.nullish)], ([curVal, addVal]) => curVal + addVal)
    .with([P.not(P.nullish), P.nullish], () => number1)
    .with([P.nullish, P.not(P.nullish)], () => number2)
    .otherwise(() => undefined);
};

export const parseDate = (
  dateStr: string | null | undefined,
  referenceData: Date = new Date(),
  setToDefaultTimeZone = true
) => {
  try {
    let date =
      dateStr !== null && dateStr !== undefined
        ? parse(dateStr, DATETIME_FORMAT_TZ, referenceData)
        : null;
    if (date != null && setToDefaultTimeZone && new Date().getTimezoneOffset() === 0) {
      date = utcToZonedTime(date, DEFAULT_TIMEZONE);
    }
    return date;
  } catch (e) {
    return null;
  }
};

export const currentDateInDefaultTimezone = () => {
  const currentDate = new Date();
  return currentDate.getTimezoneOffset() === 0
    ? utcToZonedTime(currentDate, DEFAULT_TIMEZONE)
    : currentDate;
};

const sortSubEntities = (subEntities: Array<SubKeyWithAmounts>) => {
  const childrenSorted: Array<SubKeyWithAmounts> = subEntities.map((child) =>
    child.items ? { ...child, items: sortSubEntities(child.items) } : child
  );
  // Käytetään sorttauksessa erillistä rakennetta, jolla sorttauksessa kaikki ala-tason entiteetit sisältäen "muu" saadaan
  // sijoitettua listan loppuun
  const itemsForSorting = childrenSorted.map((child) => ({
    sortKey: child.subkey.toLowerCase().includes("muu") ? `2${child.subkey}` : `1${child.subkey}`,
    subEntity: child,
  }));
  const sortedItems = itemsForSorting.sort((entry1, entry2) => {
    return entry1.sortKey > entry2.sortKey ? 1 : -1;
  });
  return sortedItems.map((item) => item.subEntity);
};

export const dbQueryResultToPulssiData = (
  rows: Array<DatabaseRow>,
  entity: EntityType,
  oldDataRows?: Array<DatabaseRow>
) => {
  const countsBySubKey = rows.reduce((result, row) => {
    const ktParts = row.sub_entity.split("/");
    let parentArray: Array<SubKeyWithAmounts> = result;
    let targetObject: SubKeyWithAmounts | null = null;
    const oldDataRow = oldDataRows
      ? oldDataRows.find((dr) => dr.sub_entity === row.sub_entity && dr.tila === row.tila)
      : undefined;

    for (let idx = 0; idx < ktParts.length; idx++) {
      const thisIsParentLevel = idx < ktParts.length - 1;
      // Aloitetaan haku taulukon loppupäästä; tietokanta-sorttauksen myötä taulukon loppupäästä löytyy viimeisimmät / käsittelyssä olevat avain-arvot
      const subEntityIdx = findLastIndex(
        parentArray,
        (subEntity) => subEntity.subkey === ktParts[idx]
      );
      if (subEntityIdx == -1) {
        targetObject = {
          subkey: ktParts[idx],
          items: thisIsParentLevel ? new Array<SubKeyWithAmounts>() : undefined,
        };
        parentArray.push(targetObject);
      } else {
        targetObject = parentArray[subEntityIdx];
      }

      const amountKey = row.tila === "julkaistu" ? "julkaistu_amount" : "arkistoitu_amount";
      targetObject[amountKey] = sumUp(targetObject[amountKey], row.amount);
      if (oldDataRow) {
        const amountKeyOld =
          row.tila === "julkaistu" ? "julkaistu_amount_old" : "arkistoitu_amount_old";
        targetObject[amountKeyOld] = sumUp(targetObject[amountKeyOld], oldDataRow.amount);
      }

      parentArray = targetObject.items ? targetObject.items : parentArray;
    }
    return result;
  }, new Array<SubKeyWithAmounts>());

  const sortedSubItems = countsBySubKey.map((sub) =>
    sub.items ? { ...sub, items: sortSubEntities(sub.items) } : sub
  );
  return {
    by_tila: {
      julkaistu_amount: sumBy("julkaistu", "amount", rows),
      julkaistu_amount_old: sumBy("julkaistu", "amount", oldDataRows),
      arkistoitu_amount: sumBy("arkistoitu", "amount", rows),
      arkistoitu_amount_old: sumBy("arkistoitu", "amount", oldDataRows),
      ...(entity === "toteutus"
        ? {
            julkaistu_jotpa_amount: sumBy("julkaistu", "jotpa_amount", rows),
            julkaistu_jotpa_amount_old: sumBy("julkaistu", "jotpa_amount", oldDataRows),
            arkistoitu_jotpa_amount: sumBy("arkistoitu", "jotpa_amount", rows),
            arkistoitu_jotpa_amount_old: sumBy("arkistoitu", "jotpa_amount", oldDataRows),
            julkaistu_taydennyskoulutus_amount: sumBy(
              "julkaistu",
              "taydennyskoulutus_amount",
              rows
            ),
            julkaistu_taydennyskoulutus_amount_old: sumBy(
              "julkaistu",
              "taydennyskoulutus_amount",
              oldDataRows
            ),
            arkistoitu_taydennyskoulutus_amount: sumBy(
              "arkistoitu",
              "taydennyskoulutus_amount",
              rows
            ),
            arkistoitu_taydennyskoulutus_amount_old: sumBy(
              "arkistoitu",
              "taydennyskoulutus_amount",
              oldDataRows
            ),
            julkaistu_tyovoimakoulutus_amount: sumBy("julkaistu", "tyovoimakoulutus_amount", rows),
            julkaistu_tyovoimakoulutus_amount_old: sumBy(
              "julkaistu",
              "tyovoimakoulutus_amount",
              oldDataRows
            ),
            arkistoitu_tyovoimakoulutus_amount: sumBy(
              "arkistoitu",
              "tyovoimakoulutus_amount",
              rows
            ),
            arkistoitu_tyovoimakoulutus_amount_old: sumBy(
              "arkistoitu",
              "tyovoimakoulutus_amount",
              oldDataRows
            ),
          }
        : {}),
    },
    items: sortedSubItems.sort((entry1, entry2) => (entry1.subkey > entry2.subkey ? 1 : -1)),
  };
};

const resolveMissingSubentitiesOfEntity = (
  expectedSubentities: Array<string>,
  subEntities: Array<DatabaseRow>
) => {
  return expectedSubentities.reduce(
    (result, searched) => {
      if (!subEntities.find((sub) => sub.sub_entity === searched && sub.tila === "julkaistu")) {
        result.julkaistu.push(searched);
      }
      if (!subEntities.find((sub) => sub.sub_entity === searched && sub.tila === "arkistoitu")) {
        result.arkistoitu.push(searched);
      }
      return result;
    },
    { julkaistu: new Array<string>(), arkistoitu: new Array<string>() }
  );
};

export const resolveMissingSubentities = (
  allSubentitiesByEntities: SubEntitiesByEntities,
  foundEntities: EntityDatabaseResults
) => {
  return {
    koulutukset: resolveMissingSubentitiesOfEntity(
      allSubentitiesByEntities.koulutukset,
      foundEntities.koulutukset
    ),
    toteutukset: resolveMissingSubentitiesOfEntity(
      allSubentitiesByEntities.toteutukset,
      foundEntities.toteutukset
    ),
    hakukohteet: resolveMissingSubentitiesOfEntity(
      allSubentitiesByEntities.hakukohteet,
      foundEntities.hakukohteet
    ),
    haut: resolveMissingSubentitiesOfEntity(allSubentitiesByEntities.haut, foundEntities.haut),
  };
};

export const findMissingHistoryAmountsForEntity = (
  missingSubentityAmounts: SubEntityAmounts,
  currentDbData: Array<DatabaseRow>
): Array<DatabaseRow> => {
  const returnValue = new Array<DatabaseRow>();

  const pickFromDataByTila = (searched: string, tila: Julkaisutila) => {
    const data = currentDbData.find((data) => data.sub_entity === searched && data.tila === tila);
    if (data) {
      returnValue.push(data);
    }
  };

  missingSubentityAmounts.julkaistu.forEach((sub) => pickFromDataByTila(sub, "julkaistu"));
  missingSubentityAmounts.arkistoitu.forEach((sub) => pickFromDataByTila(sub, "arkistoitu"));
  return returnValue;
};

export const discardAmountsWhenOutOfTimelimit = (
  dbRow: DatabaseRow,
  timeLimit: Date | null
): DatabaseRow => {
  const baseDbRow = {
    sub_entity: dbRow.sub_entity,
    tila: dbRow.tila,
    start_timestamp: dbRow.start_timestamp,
  };
  return timeLimit && isAfter(dbRow.start_timestamp, timeLimit)
    ? { ...baseDbRow }
    : {
        ...baseDbRow,
        amount: dbRow.amount,
        jotpa_amount: dbRow.jotpa_amount,
        taydennyskoulutus_amount: dbRow.taydennyskoulutus_amount,
        tyovoimakoulutus_amount: dbRow.tyovoimakoulutus_amount,
      };
};
