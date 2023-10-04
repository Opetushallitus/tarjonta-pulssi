import type { DatabaseRow, SubKeyWithAmounts } from '../packages/frontend/app/servers/types';
import { dbQueryResultToPulssiData } from '../packages/frontend/app/servers/amountDataUtils'

const dbResults: Array<DatabaseRow> = [
  { sub_entity: "aaa", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 1},
  { sub_entity: "aaa", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 3},
  { sub_entity: "ccc/aaa", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 5},
  { sub_entity: "ccc/aaa", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 7},
  { sub_entity: "ccc/ddd", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 9},
  { sub_entity: "ccc/ddd", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 11},
  { sub_entity: "ccc/bbb", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 13},
  { sub_entity: "ccc/bbb", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 15},
  { sub_entity: "ccc/muu-bbb", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 17},
  { sub_entity: "ccc/muu-bbb", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 19},
  { sub_entity: "ccc/muu-aaa", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 21},
  { sub_entity: "ccc/muu-aaa", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 23},
  { sub_entity: "ccc/ooo", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 25},
  { sub_entity: "ccc/ooo", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 27},
  { sub_entity: "bbb/nnn", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 29},
  { sub_entity: "bbb/nnn", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 31},
  { sub_entity: "bbb/ppp", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 33},
  { sub_entity: "bbb/ppp", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 35},
  { sub_entity: "ddd", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", amount: 37},
  { sub_entity: "ddd", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", amount: 39},
  { sub_entity: "eee", tila: "julkaistu", start_timestamp: "16.9.2023 13:00", amount: 41},
  { sub_entity: "eee", tila: "arkistoitu", start_timestamp: "16.9.2023 13:00", amount: 43},
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
  { sub_entity: "aaa", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", 
    amount: 1, jotpa_amount: 2, taydennyskoulutus_amount: 3, tyovoimakoulutus_amount: 4},
  { sub_entity: "aaa", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", 
    amount: 5, jotpa_amount: 6, taydennyskoulutus_amount: 7, tyovoimakoulutus_amount: 8},
  { sub_entity: "bbb", tila: "julkaistu", start_timestamp: "15.9.2023 13:00", 
    amount: 9, jotpa_amount: 10, taydennyskoulutus_amount: 11, tyovoimakoulutus_amount: 12},
  { sub_entity: "bbb", tila: "arkistoitu", start_timestamp: "15.9.2023 13:00", 
    amount: 13, jotpa_amount: 14, taydennyskoulutus_amount: 15, tyovoimakoulutus_amount: 16},
  { sub_entity: "ccc/aaa", tila: "julkaistu", start_timestamp: "16.9.2023 13:00", 
    amount: 17, jotpa_amount: 18, taydennyskoulutus_amount: 19, tyovoimakoulutus_amount: 20},
  { sub_entity: "ccc/aaa", tila: "arkistoitu", start_timestamp: "16.9.2023 13:00", 
    amount: 21, jotpa_amount: 22, taydennyskoulutus_amount: 23, tyovoimakoulutus_amount: 24},
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
  const expected = expectedItems.map(sub => sub.subkey === "eee" ? { subkey: "eee", julkaistu_amount: -1, arkistoitu_amount: -1} : sub);
  expect(dbQueryResultToPulssiData(dbResults, "koulutus", "15.9.2023 14:00").items).toMatchObject(expected);
});

test("Amounts by tila parsed correctly when some results excluded by timestamp", () => {
  expect(dbQueryResultToPulssiData(dbResults, "koulutus", "15.9.2023 14:00").by_tila).toMatchObject({ julkaistu_amount: 190, arkistoitu_amount: 210});
});

test("Amounts by tila for toteutukset should be parsed correctly", () => {
  expect(dbQueryResultToPulssiData(toteutusDbResults, "toteutus").by_tila).toMatchObject(expectedByTilaForToteutukset);
});

test("Amounts by tila for toteutukset parsed correctly when some results excluded by timestamp", () => {
  expect(dbQueryResultToPulssiData(toteutusDbResults, "toteutus", "15.9.2023 14:00").by_tila).toMatchObject(expectedByTilaForToteutuksetWithTimestamp);
});
