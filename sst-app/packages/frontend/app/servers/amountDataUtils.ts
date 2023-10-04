import type { EntityType } from "../../../shared/types";
import type {
  DatabaseRow,
  EntityDataWithSubKey,
  PulssiData,
  SubEntitiesByEntities,
  SubEntityAmounts,
  SubEntityField,
  SubEntityTila,
  SubKeyWithAmounts,
} from "./types";
import { findLastIndex, update } from "lodash";

const rowAmount = (row: DatabaseRow, amountFieldName: keyof DatabaseRow, maxTimestamp: string | null = null) =>
  maxTimestamp && row.start_timestamp && row.start_timestamp > maxTimestamp
    ? Number(-1)
    : Number(row[amountFieldName]);

const sumBy = (
  rows: Array<DatabaseRow>,
  tilaFilterValue: SubEntityTila,
  amountFieldName: keyof DatabaseRow,
  maxTimestamp: string | null = null
) => {
  return rows.reduce((result, row) => {
    const amountValue = rowAmount(row, amountFieldName, maxTimestamp);
    const addedValue =
      row.tila === tilaFilterValue && amountValue !== -1 ? amountValue : 0;
    return result + addedValue;
  }, 0);
};

const EMPTY_ITEMS = new Array<SubKeyWithAmounts>();

const sortSubEntities = (subEntities: Array<SubKeyWithAmounts>) => {
  const childrenSorted: Array<SubKeyWithAmounts> = subEntities.map((child) =>
    child.items ? { ...child, items: sortSubEntities(child.items) } : child
  );
  // Käytetään sorttauksessa erillistä rakennetta, jolla sorttauksessa kaikki ala-tason entiteetit sisältäen "muu" saadaan
  // sijoitettua listan loppuun
  const itemsForSorting = childrenSorted.map((child) => ({
    sortKey: child.subkey.toLowerCase().includes("muu")
      ? `2${child.subkey}`
      : `1${child.subkey}`,
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
  maxTimestamp: string | null = null
) => {
  const countsBySubKey = rows.reduce((result, row) => {
    const amountField =
      row.tila === "julkaistu" ? "julkaistu_amount" : "arkistoitu_amount";
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
          items: thisIsParentLevel
            ? new Array<SubKeyWithAmounts>()
            : undefined,
        };
        parentArray.push(targetObject);
      } else {
        targetObject = parentArray[subEntityIdx];
      }

      const currentAmount =
        row.tila === "julkaistu"
          ? targetObject.julkaistu_amount ?? 0
          : targetObject.arkistoitu_amount ?? 0;
      targetObject[amountField] = currentAmount + rowAmount(row, "amount", maxTimestamp);

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
    items: sortedSubItems.sort((entry1, entry2) =>
      entry1.subkey > entry2.subkey ? 1 : -1
    ),
  };
};

const findFromSubEntityDbResults = (
  subEntities: Array<any>,
  subEntityField: SubEntityField,
  subEntityValue: string,
  tila: SubEntityTila
) =>
  subEntities.find(
    (sub) => sub[subEntityField] === subEntityValue && sub.tila === tila
  );

const resolveMissingAmountsOfEntity = (
  expectedSubentities: Array<string>,
  subEntities: Array<any>,
  subEntityField: SubEntityField
) => {
  return expectedSubentities.reduce(
    (result, subEntity) => {
      if (
        !findFromSubEntityDbResults(
          subEntities,
          subEntityField,
          subEntity,
          "julkaistu"
        )
      ) {
        result.julkaistu.push(subEntity);
      }
      if (
        !findFromSubEntityDbResults(
          subEntities,
          subEntityField,
          subEntity,
          "arkistoitu"
        )
      ) {
        result.arkistoitu.push(subEntity);
      }
      return result;
    },
    { julkaistu: new Array<string>(), arkistoitu: new Array<string>() }
  );
};

export const resolveMissingAmounts = (
  allSubentitiesByEntities: SubEntitiesByEntities,
  foundKoulutukset: Array<any>,
  foundToteutukset: Array<any>,
  foundHakukohteet: Array<any>,
  foundHaut: Array<any>
) => {
  return {
    koulutukset: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.koulutukset,
      foundKoulutukset,
      "tyyppi_path"
    ),
    toteutukset: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.toteutukset,
      foundToteutukset,
      "tyyppi_path"
    ),
    hakukohteet: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.hakukohteet,
      foundHakukohteet,
      "tyyppi_path"
    ),
    haut: resolveMissingAmountsOfEntity(
      allSubentitiesByEntities.haut,
      foundHaut,
      "hakutapa"
    ),
  };
};

export const findMissingHistoryAmountsForEntity = (
  entity: EntityType,
  missingSubentityAmounts: SubEntityAmounts,
  currentDbData: Array<any>
) => {
  const subEntityField = entity === "haku" ? "hakutapa" : "tyyppi_path";
  return missingSubentityAmounts.julkaistu
    .map((sub) =>
      findFromSubEntityDbResults(
        currentDbData,
        subEntityField,
        sub,
        "julkaistu"
      )
    )
    .filter((sub) => sub)
    .concat(
      missingSubentityAmounts.arkistoitu
        .map((sub) =>
          findFromSubEntityDbResults(
            currentDbData,
            subEntityField,
            sub,
            "arkistoitu"
          )
        )
        .filter((sub) => sub)
    );
};

const setCombinedSubentityData = (
  path: string,
  subEntities: Array<SubKeyWithAmounts> = EMPTY_ITEMS,
  targetData: PulssiData
) => {
  for (let idx = 0; idx < subEntities.length; idx++) {
    Object.entries(subEntities[idx]).forEach((entry) => {
      if (entry[0].endsWith("_amount")) {
        update(
          targetData,
          `${path}.items[${idx}].${entry[0]}_old`,
          (_) => entry[1]
        );
      }
    });
    if (subEntities[idx].items) {
      setCombinedSubentityData(
        `${path}.items[${idx}]`,
        subEntities[idx].items,
        targetData
      );
    }
  }
};
const setCombinedEntityHistoryData = (
  path: string,
  entityData: EntityDataWithSubKey,
  targetData: PulssiData
) => {
  Object.entries(entityData.by_tila).forEach((entry) =>
    update(targetData, `${path}.${entry[0]}_old`, (_) => entry[1])
  );
  setCombinedSubentityData(`${path}`, entityData.items, targetData);
};

export const getCombinedHistoryData = (
  startData: PulssiData,
  endData: PulssiData
) => {
  const combined = JSON.parse(JSON.stringify(endData));
  setCombinedEntityHistoryData("koulutukset", startData.koulutukset, combined);
  setCombinedEntityHistoryData("toteutukset", startData.toteutukset, combined);
  setCombinedEntityHistoryData("hakukohteet", startData.hakukohteet, combined);
  setCombinedEntityHistoryData("haut", startData.haut, combined);
  return combined;
};
