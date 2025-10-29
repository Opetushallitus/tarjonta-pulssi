import { parse } from "date-fns";

import {
  dbQueryResultToPulssiData,
  findMissingHistoryAmountsForEntity,
  resolveMissingSubentities,
} from "~/shared/amountDataUtils";
import { DATETIME_FORMAT_TZ } from "~/shared/constants";
import type { DatabaseRow, SubEntityAmounts, SubKeyWithAmounts } from "~/shared/types";

const referenceDate = new Date();

const dbResults: Array<DatabaseRow> = [
  {
    sub_entity: "aaa",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 1,
  },
  {
    sub_entity: "aaa",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 3,
  },
  {
    sub_entity: "ccc/aaa",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 5,
  },
  {
    sub_entity: "ccc/aaa",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 7,
  },
  {
    sub_entity: "ccc/ddd",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 9,
  },
  {
    sub_entity: "ccc/ddd",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 11,
  },
  {
    sub_entity: "ccc/bbb",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 13,
  },
  {
    sub_entity: "ccc/bbb",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 15,
  },
  {
    sub_entity: "ccc/muu-bbb",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 17,
  },
  {
    sub_entity: "ccc/muu-bbb",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 19,
  },
  {
    sub_entity: "ccc/muu-aaa",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 21,
  },
  {
    sub_entity: "ccc/muu-aaa",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 23,
  },
  {
    sub_entity: "ccc/ooo",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 25,
  },
  {
    sub_entity: "ccc/ooo",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 27,
  },
  {
    sub_entity: "bbb/nnn",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 29,
  },
  {
    sub_entity: "bbb/nnn",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 31,
  },
  {
    sub_entity: "bbb/ppp",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 33,
  },
  {
    sub_entity: "bbb/ppp",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 35,
  },
  {
    sub_entity: "ddd",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 37,
  },
  {
    sub_entity: "ddd",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 39,
  },
  {
    sub_entity: "eee",
    tila: "julkaistu",
    start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 41,
  },
  {
    sub_entity: "eee",
    tila: "arkistoitu",
    start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 43,
  },
];

const dbResultsOld = dbResults.map((sub) => ({
  sub_entity: sub.sub_entity,
  tila: sub.tila,
  start_timestamp: sub.start_timestamp,
  amount: (sub.amount || 1) - 1,
}));

const expectedItems: Array<SubKeyWithAmounts> = [
  { subkey: "aaa", julkaistu_amount: 1, arkistoitu_amount: 3 },
  {
    subkey: "bbb",
    julkaistu_amount: 62,
    arkistoitu_amount: 66,
    items: [
      { subkey: "nnn", julkaistu_amount: 29, arkistoitu_amount: 31 },
      { subkey: "ppp", julkaistu_amount: 33, arkistoitu_amount: 35 },
    ],
  },
  {
    subkey: "ccc",
    julkaistu_amount: 90,
    arkistoitu_amount: 102,
    items: [
      { subkey: "aaa", julkaistu_amount: 5, arkistoitu_amount: 7 },
      { subkey: "bbb", julkaistu_amount: 13, arkistoitu_amount: 15 },
      { subkey: "ddd", julkaistu_amount: 9, arkistoitu_amount: 11 },
      { subkey: "ooo", julkaistu_amount: 25, arkistoitu_amount: 27 },
      { subkey: "muu-aaa", julkaistu_amount: 21, arkistoitu_amount: 23 },
      { subkey: "muu-bbb", julkaistu_amount: 17, arkistoitu_amount: 19 },
    ],
  },
  { subkey: "ddd", julkaistu_amount: 37, arkistoitu_amount: 39 },
  { subkey: "eee", julkaistu_amount: 41, arkistoitu_amount: 43 },
];

const toOldData = (dataItem: SubKeyWithAmounts): SubKeyWithAmounts => ({
  subkey: dataItem.subkey,
  julkaistu_amount: dataItem.julkaistu_amount,
  julkaistu_amount_old:
    (dataItem.julkaistu_amount || 1) - (dataItem.items ? dataItem.items.length : 1),
  arkistoitu_amount: dataItem.arkistoitu_amount,
  arkistoitu_amount_old:
    (dataItem.arkistoitu_amount || 1) - (dataItem.items ? dataItem.items.length : 1),
  items: dataItem.items ? dataItem.items.map((subItem) => toOldData(subItem)) : undefined,
});

const expectedItemsWithHistory = expectedItems.map((sub) => toOldData(sub));

const expectedByTila = { julkaistu_amount: 231, arkistoitu_amount: 253 };
const expectedByTilaWithHistory = {
  julkaistu_amount: 231,
  julkaistu_amount_old: 220,
  arkistoitu_amount: 253,
  arkistoitu_amount_old: 242,
};

const toteutusDbResults: Array<DatabaseRow> = [
  {
    sub_entity: "aaa",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 1,
    jotpa_amount: 2,
    taydennyskoulutus_amount: 3,
    tyovoimakoulutus_amount: 4,
    pieni_osaamiskokonaisuus_amount: 2,
  },
  {
    sub_entity: "aaa",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 5,
    jotpa_amount: 6,
    taydennyskoulutus_amount: 7,
    tyovoimakoulutus_amount: 8,
    pieni_osaamiskokonaisuus_amount: 3,
  },
  {
    sub_entity: "bbb",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 9,
    jotpa_amount: 10,
    taydennyskoulutus_amount: 11,
    tyovoimakoulutus_amount: 12,
    pieni_osaamiskokonaisuus_amount: 4,
  },
  {
    sub_entity: "bbb",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 13,
    jotpa_amount: 14,
    taydennyskoulutus_amount: 15,
    tyovoimakoulutus_amount: 16,
    pieni_osaamiskokonaisuus_amount: 6,
  },
  {
    sub_entity: "ccc/aaa",
    tila: "julkaistu",
    start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 17,
    jotpa_amount: 18,
    taydennyskoulutus_amount: 19,
    tyovoimakoulutus_amount: 20,
  },
  {
    sub_entity: "ccc/aaa",
    tila: "arkistoitu",
    start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 21,
    jotpa_amount: 22,
    taydennyskoulutus_amount: 23,
    tyovoimakoulutus_amount: 24,
  },
];

const toteutusDbResultsOld = toteutusDbResults.map((sub) => ({
  sub_entity: sub.sub_entity,
  tila: sub.tila,
  start_timestamp: sub.start_timestamp,
  amount: (sub.amount || 1) - 1,
  jotpa_amount: (sub.jotpa_amount || 1) - 1,
  taydennyskoulutus_amount: (sub.taydennyskoulutus_amount || 1) - 1,
  tyovoimakoulutus_amount: (sub.tyovoimakoulutus_amount || 1) - 1,
  pieni_osaamiskokonaisuus_amount: (sub.pieni_osaamiskokonaisuus_amount || 1) - 1,
}));

const hakukohdeDbResults: Array<DatabaseRow> = [
  {
    sub_entity: "aaa",
    tila: "julkaistu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 1,
  },
  {
    sub_entity: "bbb",
    tila: "arkistoitu",
    start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate),
    amount: 1,
  },
];

const expectedByTilaForToteutukset = {
  julkaistu_amount: 27,
  arkistoitu_amount: 39,
  julkaistu_jotpa_amount: 30,
  arkistoitu_jotpa_amount: 42,
  julkaistu_taydennyskoulutus_amount: 33,
  arkistoitu_taydennyskoulutus_amount: 45,
  julkaistu_tyovoimakoulutus_amount: 36,
  arkistoitu_tyovoimakoulutus_amount: 48,
  julkaistu_pieni_osaamiskokonaisuus_amount: 6,
  arkistoitu_pieni_osaamiskokonaisuus_amount: 9,
};

const expectedByTilaForToteutuksetWithHistory = {
  julkaistu_amount: 27,
  julkaistu_amount_old: 24,
  arkistoitu_amount: 39,
  arkistoitu_amount_old: 36,
  julkaistu_jotpa_amount: 30,
  julkaistu_jotpa_amount_old: 27,
  arkistoitu_jotpa_amount: 42,
  arkistoitu_jotpa_amount_old: 39,
  julkaistu_taydennyskoulutus_amount: 33,
  julkaistu_taydennyskoulutus_amount_old: 30,
  arkistoitu_taydennyskoulutus_amount: 45,
  arkistoitu_taydennyskoulutus_amount_old: 42,
  julkaistu_tyovoimakoulutus_amount: 36,
  julkaistu_tyovoimakoulutus_amount_old: 33,
  arkistoitu_tyovoimakoulutus_amount: 48,
  arkistoitu_tyovoimakoulutus_amount_old: 45,
  julkaistu_pieni_osaamiskokonaisuus_amount: 6,
  julkaistu_pieni_osaamiskokonaisuus_amount_old: 4,
  arkistoitu_pieni_osaamiskokonaisuus_amount: 9,
  arkistoitu_pieni_osaamiskokonaisuus_amount_old: 7,
};

test("Db query results should be correctly parsed and sorted", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus").items).toMatchObject(expectedItems);
});

test("Amounts by tila should be parsed correctly", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus").by_tila).toMatchObject(expectedByTila);
});

test("Db query results should be correctly parsed when history data included", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus", dbResultsOld).items).toMatchObject(
    expectedItemsWithHistory
  );
});

test("Amounts by tila should be parsed correctly when history data included", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus", dbResultsOld).by_tila).toMatchObject(
    expectedByTilaWithHistory
  );
});

test("Amounts by tila for toteutukset should be parsed correctly", () => {
  expect(dbQueryResultToPulssiData(toteutusDbResults, "toteutus").by_tila).toMatchObject(
    expectedByTilaForToteutukset
  );
});

test("Amounts by tila for toteutukset should be parsed correctly when history data included", () => {
  expect(
    dbQueryResultToPulssiData(toteutusDbResults, "toteutus", toteutusDbResultsOld).by_tila
  ).toMatchObject(expectedByTilaForToteutuksetWithHistory);
});

test("Missing db results resolved correctly", () => {
  const allSubentities = {
    koulutukset: dbResults.map((res) => res.sub_entity).concat(["fff", "ggg/aaa"]),
    toteutukset: toteutusDbResults.map((res) => res.sub_entity),
    hakukohteet: hakukohdeDbResults.map((res) => res.sub_entity).concat(["ccc"]),
    haut: ["aaa", "bbb"],
  };
  const missingResults = resolveMissingSubentities(allSubentities, {
    koulutukset: dbResults,
    toteutukset: toteutusDbResults,
    hakukohteet: hakukohdeDbResults,
    haut: [],
  });
  expect(missingResults.koulutukset).toMatchObject({
    julkaistu: ["fff", "ggg/aaa"],
    arkistoitu: ["fff", "ggg/aaa"],
  });
  expect(missingResults.toteutukset).toMatchObject({ julkaistu: [], arkistoitu: [] });
  expect(missingResults.hakukohteet).toMatchObject({
    julkaistu: ["bbb", "ccc"],
    arkistoitu: ["aaa", "ccc"],
  });
  expect(missingResults.haut).toMatchObject({
    julkaistu: ["aaa", "bbb"],
    arkistoitu: ["aaa", "bbb"],
  });
});

test("Find desired db amounts from dbresult -list correctly", () => {
  const desiredAmounts: SubEntityAmounts = {
    julkaistu: ["aaa", "ccc/muu-bbb"],
    arkistoitu: ["aaa", "bbb/nnn"],
  };
  expect(findMissingHistoryAmountsForEntity(desiredAmounts, dbResults)).toMatchObject([
    dbResults[0],
    dbResults[8],
    dbResults[1],
    dbResults[15],
  ]);
});
