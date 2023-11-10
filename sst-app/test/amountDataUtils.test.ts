import type { DatabaseRow, SubEntityAmounts, SubKeyWithAmounts } from '../packages/shared/types';
import { dbQueryResultToPulssiData, findMissingHistoryAmountsForEntity, getCombinedHistoryData, resolveMissingAmounts } from '../packages/shared/amountDataUtils'
import { merge } from "lodash";
import { parse } from "date-fns";
import { DATETIME_FORMAT_TZ } from '../packages/shared/constants';

const referenceDate = new Date();

const dbResults: Array<DatabaseRow> = [
  { sub_entity: "aaa", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 1},
  { sub_entity: "aaa", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 3},
  { sub_entity: "ccc/aaa", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 5},
  { sub_entity: "ccc/aaa", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 7},
  { sub_entity: "ccc/ddd", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 9},
  { sub_entity: "ccc/ddd", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 11},
  { sub_entity: "ccc/bbb", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 13},
  { sub_entity: "ccc/bbb", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 15},
  { sub_entity: "ccc/muu-bbb", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 17},
  { sub_entity: "ccc/muu-bbb", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 19},
  { sub_entity: "ccc/muu-aaa", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 21},
  { sub_entity: "ccc/muu-aaa", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 23},
  { sub_entity: "ccc/ooo", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 25},
  { sub_entity: "ccc/ooo", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 27},
  { sub_entity: "bbb/nnn", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 29},
  { sub_entity: "bbb/nnn", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 31},
  { sub_entity: "bbb/ppp", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 33},
  { sub_entity: "bbb/ppp", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 35},
  { sub_entity: "ddd", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 37},
  { sub_entity: "ddd", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 39},
  { sub_entity: "eee", tila: "julkaistu", start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 41},
  { sub_entity: "eee", tila: "arkistoitu", start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 43},
];

const expectedItems: Array<SubKeyWithAmounts> = [
  { subkey: "aaa", julkaistu_amount: 1, arkistoitu_amount: 3 },
  { subkey: "bbb", julkaistu_amount: 62, arkistoitu_amount: 66, items: [
    { subkey: "nnn", julkaistu_amount: 29, arkistoitu_amount: 31 },
    { subkey: "ppp", julkaistu_amount: 33, arkistoitu_amount: 35 }
  ] },
  { subkey: "ccc", julkaistu_amount: 90, arkistoitu_amount: 102, items: [
    { subkey: "aaa", julkaistu_amount: 5, arkistoitu_amount: 7 },
    { subkey: "bbb", julkaistu_amount: 13, arkistoitu_amount: 15 },
    { subkey: "ddd", julkaistu_amount: 9, arkistoitu_amount: 11 },
    { subkey: "ooo", julkaistu_amount: 25, arkistoitu_amount: 27 },
    { subkey: "muu-aaa", julkaistu_amount: 21, arkistoitu_amount: 23 },
    { subkey: "muu-bbb", julkaistu_amount: 17, arkistoitu_amount: 19 },
  ] },
  { subkey: "ddd", julkaistu_amount: 37, arkistoitu_amount: 39 },
  { subkey: "eee", julkaistu_amount: 41, arkistoitu_amount: 43 },
];
const expectedByTila = { julkaistu_amount: 231, arkistoitu_amount: 253};

const toteutusDbResults: Array<DatabaseRow> = [
  { sub_entity: "aaa", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), 
    amount: 1, jotpa_amount: 2, taydennyskoulutus_amount: 3, tyovoimakoulutus_amount: 4},
  { sub_entity: "aaa", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), 
    amount: 5, jotpa_amount: 6, taydennyskoulutus_amount: 7, tyovoimakoulutus_amount: 8},
  { sub_entity: "bbb", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), 
    amount: 9, jotpa_amount: 10, taydennyskoulutus_amount: 11, tyovoimakoulutus_amount: 12},
  { sub_entity: "bbb", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), 
    amount: 13, jotpa_amount: 14, taydennyskoulutus_amount: 15, tyovoimakoulutus_amount: 16},
  { sub_entity: "ccc/aaa", tila: "julkaistu", start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), 
    amount: 17, jotpa_amount: 18, taydennyskoulutus_amount: 19, tyovoimakoulutus_amount: 20},
  { sub_entity: "ccc/aaa", tila: "arkistoitu", start_timestamp: parse("16.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), 
    amount: 21, jotpa_amount: 22, taydennyskoulutus_amount: 23, tyovoimakoulutus_amount: 24},
];

const hakukohdeDbResults: Array<DatabaseRow> = [
  { sub_entity: "aaa", tila: "julkaistu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 1},
  { sub_entity: "bbb", tila: "arkistoitu", start_timestamp: parse("15.9.2023 13:00 +00", DATETIME_FORMAT_TZ, referenceDate), amount: 1}
];

const expectedByTilaForToteutukset = { julkaistu_amount: 27, arkistoitu_amount: 39, julkaistu_jotpa_amount: 30, arkistoitu_jotpa_amount: 42, 
  julkaistu_taydennyskoulutus_amount: 33, arkistoitu_taydennyskoulutus_amount: 45, julkaistu_tyovoimakoulutus_amount: 36, arkistoitu_tyovoimakoulutus_amount: 48 };

const expectedByTilaForToteutuksetWithTimestamp = { julkaistu_amount: 10, arkistoitu_amount: 18, julkaistu_jotpa_amount: 12, arkistoitu_jotpa_amount: 20, 
  julkaistu_taydennyskoulutus_amount: 14, arkistoitu_taydennyskoulutus_amount: 22, julkaistu_tyovoimakoulutus_amount: 16, arkistoitu_tyovoimakoulutus_amount: 24 };
  
test("Db query results should be correctly parsed and sorted", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus").items).toMatchObject(expectedItems);
});

test("Amounts by tila should be parsed correctly", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus").by_tila).toMatchObject(expectedByTila);
});

test("Db query results parsed correctly when some results excluded by timestamp", () => {
  const expected = expectedItems.map(sub => sub.subkey === "eee" ? { subkey: "eee", julkaistu_amount: undefined, arkistoitu_amount: undefined} : sub);
  expect(dbQueryResultToPulssiData(dbResults, "koulutus", parse("15.9.2023 16:01 +00", DATETIME_FORMAT_TZ, referenceDate)).items).toMatchObject(expected);
});

test("Amounts by tila parsed correctly when some results excluded by timestamp", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus", parse("15.9.2023 16:01 +00", DATETIME_FORMAT_TZ, referenceDate)).by_tila).toMatchObject({ julkaistu_amount: 190, arkistoitu_amount: 210});
});

test("Amounts by tila for toteutukset should be parsed correctly", () => {
  expect(dbQueryResultToPulssiData(toteutusDbResults, "toteutus").by_tila).toMatchObject(expectedByTilaForToteutukset);
});

test("Amounts by tila for toteutukset parsed correctly when some results excluded by timestamp", () => {
  expect(dbQueryResultToPulssiData(toteutusDbResults, "toteutus", parse("15.9.2023 16:01 +00", DATETIME_FORMAT_TZ, referenceDate)).by_tila).toMatchObject(expectedByTilaForToteutuksetWithTimestamp);
});

test("Missing db results resolved correctly", () => {
  const allSubentities = { 
    koulutukset: dbResults.map(res => res.sub_entity).concat(["fff", "ggg/aaa"]),
    toteutukset: toteutusDbResults.map(res => res.sub_entity),
    hakukohteet: hakukohdeDbResults.map(res => res.sub_entity).concat(["ccc"]),
    haut: ["aaa", "bbb"]
  };
  const missingResults = resolveMissingAmounts(allSubentities, dbResults, toteutusDbResults, hakukohdeDbResults, []);
  expect(missingResults.koulutukset).toMatchObject({ julkaistu: ["fff", "ggg/aaa"], arkistoitu: ["fff", "ggg/aaa"]})
  expect(missingResults.toteutukset).toMatchObject({ julkaistu: [], arkistoitu: []})
  expect(missingResults.hakukohteet).toMatchObject({ julkaistu: ["bbb", "ccc"], arkistoitu: ["aaa", "ccc"]})
  expect(missingResults.haut).toMatchObject({ julkaistu: ["aaa", "bbb"], arkistoitu: ["aaa", "bbb"]})
});

test("Find desired db amounts from dbresult -list correctly", () => {
  const desiredAmounts: SubEntityAmounts = { julkaistu: ["aaa", "ccc/muu-bbb"], arkistoitu: ["aaa", "bbb/nnn"]};
  expect(findMissingHistoryAmountsForEntity(desiredAmounts, dbResults)).toMatchObject([dbResults[0], dbResults[8], dbResults[1], dbResults[15]])
});

test("History amounts combined correctly", () => {
  const startData = { 
    koulutukset: {items: [], by_tila: { julkaistu_amount: 0, arkistoitu_amount: 0 }},
    toteutukset: {items: [{ subkey: "aaa", julkaistu_amount: 1, arkistoitu_amount: 2, julkaistu_jotpa_amount: 3, arkistoitu_jotpa_amount: 4, 
                            julkaistu_taydennyskoulutus_amount: 5, arkistoitu_taydennyskoulutus_amount: 6, julkaistu_tyovoimakoulutus_amount: 7, arkistoitu_tyovoimakoulutus_amount: 8,
                            items: [{subkey: "bbb", julkaistu_amount: 2, arkistoitu_amount: 3, julkaistu_jotpa_amount: 4, arkistoitu_jotpa_amount: 5, 
                            julkaistu_taydennyskoulutus_amount: 6, arkistoitu_taydennyskoulutus_amount: 7, julkaistu_tyovoimakoulutus_amount: 8, arkistoitu_tyovoimakoulutus_amount: 9}]},
                          { subkey: "ccc", julkaistu_amount: 3, arkistoitu_amount: 4, julkaistu_jotpa_amount: 5, arkistoitu_jotpa_amount: 6, 
                            julkaistu_taydennyskoulutus_amount: 7, arkistoitu_taydennyskoulutus_amount: 8, julkaistu_tyovoimakoulutus_amount: 9, arkistoitu_tyovoimakoulutus_amount: 10,
                            items: [{subkey: "ddd", julkaistu_amount: -1, arkistoitu_amount: -1, julkaistu_jotpa_amount: -1, arkistoitu_jotpa_amount: -1, 
                            julkaistu_taydennyskoulutus_amount: -1, arkistoitu_taydennyskoulutus_amount: -1, julkaistu_tyovoimakoulutus_amount: -1, arkistoitu_tyovoimakoulutus_amount: -1}]}],
                  by_tila: {julkaistu_amount: 6, arkistoitu_amount: 9, julkaistu_jotpa_amount: 12, arkistoitu_jotpa_amount: 15, 
                            julkaistu_taydennyskoulutus_amount: 18, arkistoitu_taydennyskoulutus_amount: 21, julkaistu_tyovoimakoulutus_amount: 24, arkistoitu_tyovoimakoulutus_amount: 27}},
    hakukohteet: {items: [], by_tila: { julkaistu_amount: 0, arkistoitu_amount: 0 }},
    haut: {items: [], by_tila: { julkaistu_amount: 0, arkistoitu_amount: 0 }}
  };
  const endData = { 
    koulutukset: {items: [], by_tila: { julkaistu_amount: 0, arkistoitu_amount: 0 }},
    toteutukset: {items: [{ subkey: "aaa", julkaistu_amount: 2, arkistoitu_amount: 3, julkaistu_jotpa_amount: 4, arkistoitu_jotpa_amount: 5, 
                            julkaistu_taydennyskoulutus_amount: 6, arkistoitu_taydennyskoulutus_amount: 7, julkaistu_tyovoimakoulutus_amount: 8, arkistoitu_tyovoimakoulutus_amount: 9,
                            items: [{subkey: "bbb", julkaistu_amount: 3, arkistoitu_amount: 4, julkaistu_jotpa_amount: 5, arkistoitu_jotpa_amount: 6, 
                            julkaistu_taydennyskoulutus_amount: 7, arkistoitu_taydennyskoulutus_amount: 8, julkaistu_tyovoimakoulutus_amount: 9, arkistoitu_tyovoimakoulutus_amount: 10}]},
                          { subkey: "ccc", julkaistu_amount: -1, arkistoitu_amount: -1, julkaistu_jotpa_amount: -1, arkistoitu_jotpa_amount: -1, 
                            julkaistu_taydennyskoulutus_amount: -1, arkistoitu_taydennyskoulutus_amount: -1, julkaistu_tyovoimakoulutus_amount: -1, arkistoitu_tyovoimakoulutus_amount: -1,
                            items: [{subkey: "ddd", julkaistu_amount: 4, arkistoitu_amount: 5, julkaistu_jotpa_amount: 6, arkistoitu_jotpa_amount: 7, 
                            julkaistu_taydennyskoulutus_amount: 8, arkistoitu_taydennyskoulutus_amount: 9, julkaistu_tyovoimakoulutus_amount: 10, arkistoitu_tyovoimakoulutus_amount: 11}]}],
                  by_tila: {julkaistu_amount: 9, arkistoitu_amount: 12, julkaistu_jotpa_amount: 15, arkistoitu_jotpa_amount: 18, 
                            julkaistu_taydennyskoulutus_amount: 21, arkistoitu_taydennyskoulutus_amount: 24, julkaistu_tyovoimakoulutus_amount: 27, arkistoitu_tyovoimakoulutus_amount: 30}},
    hakukohteet: {items: [], by_tila: { julkaistu_amount: 0, arkistoitu_amount: 0 }},
    haut: {items: [], by_tila: { julkaistu_amount: 0, arkistoitu_amount: 0 }}
  };
  const dataWithOldAmounts = JSON.parse(JSON.stringify(startData).replace(/amount"/g, "amount_old\""));
  expect(getCombinedHistoryData(startData, endData)).toMatchObject(merge(endData, dataWithOldAmounts));
});