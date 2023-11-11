import { parse, isAfter } from "date-fns";
import { findLastIndex, update } from "lodash";
import { P, match } from "ts-pattern";

import { DATETIME_FORMAT_TZ } from "./constants";
import type {
  DatabaseRow,
  EntityDataWithSubKey,
  EntityType,
  PulssiData,
  SubEntitiesByEntities,
  SubEntityAmounts,
  Julkaisutila,
  SubKeyWithAmounts,
} from "./types";

export const EMPTY_DATABASE_RESULTS = {
  koulutukset: [],
  toteutukset: [],
  hakukohteet: [],
  haut: [],
};

const rowAmount = (
  row: DatabaseRow,
  amountFieldName: keyof DatabaseRow,
  maxTimestamp: Date | null = null
) =>
  maxTimestamp && row.start_timestamp && isAfter(row.start_timestamp, maxTimestamp)
    ? undefined
    : Number(row[amountFieldName]);

const sumBy = (
  rows: Array<DatabaseRow>,
  tilaFilterValue: Julkaisutila,
  amountFieldName: keyof DatabaseRow,
  maxTimestamp: Date | null = null
) => {
  return rows.reduce((result, row) => {
    const amountValue = rowAmount(row, amountFieldName, maxTimestamp);
    const addedValue = row.tila === tilaFilterValue && amountValue ? amountValue : 0;
    return result + addedValue;
  }, 0);
};

export const sumUp = (number1: number | undefined, number2: number | undefined) => {
  return match([number1, number2])
    .with([P.not(P.nullish), P.not(P.nullish)], ([curVal, addVal]) => curVal + addVal)
    .with([P.not(P.nullish), P.nullish], () => number1)
    .with([P.nullish, P.not(P.nullish)], () => number2)
    .otherwise(() => undefined);
};

export const parseDate = (dateStr: string | null | undefined, referenceData: Date = new Date()) => {
  try {
    return dateStr !== null && dateStr !== undefined
      ? parse(dateStr, DATETIME_FORMAT_TZ, referenceData)
      : null;
  } catch (e) {
    return null;
  }
};

const EMPTY_ITEMS = new Array<SubKeyWithAmounts>();

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
  maxTimestamp: Date | null = null
) => {
  const countsBySubKey = rows.reduce((result, row) => {
    const amountField = row.tila === "julkaistu" ? "julkaistu_amount" : "arkistoitu_amount";
    const ktParts = row.sub_entity.split("/");
    let parentArray: Array<SubKeyWithAmounts> = result;
    let targetObject: SubKeyWithAmounts | null = null;
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

      const currentAmount =
        row.tila === "julkaistu" ? targetObject.julkaistu_amount : targetObject.arkistoitu_amount;
      const addedAmount = rowAmount(row, "amount", maxTimestamp);
      targetObject[amountField] = sumUp(currentAmount, addedAmount);
      parentArray = targetObject.items ? targetObject.items : parentArray;
    }
    return result;
  }, new Array<SubKeyWithAmounts>());

  const sortedSubItems = countsBySubKey.map((sub) =>
    sub.items ? { ...sub, items: sortSubEntities(sub.items) } : sub
  );
  return {
    by_tila: {
      julkaistu_amount: sumBy(rows, "julkaistu", "amount", maxTimestamp),
      arkistoitu_amount: sumBy(rows, "arkistoitu", "amount", maxTimestamp),
      ...(entity === "toteutus"
        ? {
            julkaistu_jotpa_amount: sumBy(rows, "julkaistu", "jotpa_amount", maxTimestamp),
            arkistoitu_jotpa_amount: sumBy(rows, "arkistoitu", "jotpa_amount", maxTimestamp),
            julkaistu_taydennyskoulutus_amount: sumBy(
              rows,
              "julkaistu",
              "taydennyskoulutus_amount",
              maxTimestamp
            ),
            arkistoitu_taydennyskoulutus_amount: sumBy(
              rows,
              "arkistoitu",
              "taydennyskoulutus_amount",
              maxTimestamp
            ),
            julkaistu_tyovoimakoulutus_amount: sumBy(
              rows,
              "julkaistu",
              "tyovoimakoulutus_amount",
              maxTimestamp
            ),
            arkistoitu_tyovoimakoulutus_amount: sumBy(
              rows,
              "arkistoitu",
              "tyovoimakoulutus_amount",
              maxTimestamp
            ),
          }
        : {}),
    },
    items: sortedSubItems.sort((entry1, entry2) => (entry1.subkey > entry2.subkey ? 1 : -1)),
  };
};

const resolveMissingAmountsOfEntity = (
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

export const resolveMissingAmounts = (
  allSubentitiesByEntities: SubEntitiesByEntities,
  foundKoulutukset: Array<DatabaseRow>,
  foundToteutukset: Array<DatabaseRow>,
  foundHakukohteet: Array<DatabaseRow>,
  foundHaut: Array<DatabaseRow>
) => {
  return {
    koulutukset: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.koulutukset,
      foundKoulutukset
    ),
    toteutukset: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.toteutukset,
      foundToteutukset
    ),
    hakukohteet: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.hakukohteet,
      foundHakukohteet
    ),
    haut: resolveMissingAmountsOfEntity(allSubentitiesByEntities.haut, foundHaut),
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

const setCombinedSubentityData = (
  path: string,
  subEntities: Array<SubKeyWithAmounts> = EMPTY_ITEMS,
  targetData: PulssiData
) => {
  for (let idx = 0; idx < subEntities.length; idx++) {
    Object.entries(subEntities[idx]).forEach((entry) => {
      if (entry[0].endsWith("_amount")) {
        update(targetData, `${path}.items[${idx}].${entry[0]}_old`, () => entry[1]);
      }
    });
    if (subEntities[idx].items) {
      setCombinedSubentityData(`${path}.items[${idx}]`, subEntities[idx].items, targetData);
    }
  }
};
const setCombinedEntityHistoryData = (
  path: string,
  entityData: EntityDataWithSubKey,
  targetData: PulssiData
) => {
  Object.entries(entityData.by_tila).forEach((entry) =>
    update(targetData, `${path}.by_tila.${entry[0]}_old`, () => entry[1])
  );
  setCombinedSubentityData(`${path}`, entityData.items, targetData);
};

export const getCombinedHistoryData = (startData: PulssiData, endData: PulssiData): PulssiData => {
  const combined = JSON.parse(JSON.stringify(endData));
  setCombinedEntityHistoryData("koulutukset", startData.koulutukset, combined);
  setCombinedEntityHistoryData("toteutukset", startData.toteutukset, combined);
  setCombinedEntityHistoryData("hakukohteet", startData.hakukohteet, combined);
  setCombinedEntityHistoryData("haut", startData.haut, combined);
  return combined;
};
