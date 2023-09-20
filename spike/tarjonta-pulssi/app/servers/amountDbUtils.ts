import type { Pool, QueryResult } from "pg";
import type { EntityType, Julkaisutila } from "../../../../cdk/shared/types";
import { createTilaAmountCol } from "../../../../cdk/lambda/dbUtils";

export type DbRowBase = {
  tila: Julkaisutila;
  julkaistu_amount: number;
  julkaistu_amount_old?: number;
  arkistoitu_amount: number;
  arkistoitu_amount_old?: number;
  julkaistu_jotpa_amount?: number;
  julkaistu_jotpa_amount_old?: number;
  arkistoitu_jotpa_amount?: number;
  arkistoitu_jotpa_amount_old?: number;
  julkaistu_taydennyskoulutus_amount?: number;
  julkaistu_taydennyskoulutus_amount_old?: number;
  arkistoitu_taydennyskoulutus_amount?: number;
  arkistoitu_taydennyskoulutus_amount_old?: number;
  julkaistu_tyovoimakoulutus_amount?: number;
  julkaistu_tyovoimakoulutus_amount_old?: number;
  arkistoitu_tyovoimakoulutus_amount?: number;
  arkistoitu_tyovoimakoulutus_amount_old?: number;
};

const sumBy = (arr: Array<any>, getNum: (x: any) => number) => {
  return arr.reduce((result, value) => result + getNum(value), 0);
};

const queryPulssiAmounts = async (
  pulssiDbPool: Pool,
  entity: EntityType
) => {
  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";

  return pulssiDbPool.query(
    `select ${primaryColName}, ${createTilaAmountCol(
      entity,
      "julkaistu"
    )}, ${createTilaAmountCol(
      entity,
      "arkistoitu"
    )} from ${entity}_amounts group by ${primaryColName} ${
      entity === "toteutus" ? ", jotpa_amount, taydennyskoulutus_amount, tyovoimakoulutus_amount" : ""
    }`
  );
};

const dbQueryResultToPulssiData = (
  res: QueryResult<any>,
  entity: EntityType
) => {
  const rows = res.rows;

  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";
  const dataKeyName = entity === "haku" ? "by_hakutapa" : "by_tyyppi";

  const countsBySubKey = rows.reduce((result, row) => {
    const primaryColValue = row?.[primaryColName];

    const julkaistu_amount = Number(row.julkaistu_amount);
    const arkistoitu_amount = Number(row.arkistoitu_amount);

    if (entity === "haku") {
      result[primaryColValue] = {
        julkaistu_amount,
        arkistoitu_amount,
      };
    } else {
      const ktParts = primaryColValue.split("/");
      let previousPartObj: Record<string, any> | null = null;
      ktParts.forEach((part: string) => {
        const target = previousPartObj ?? result;

        if (!target[part]) {
          target[part] = {
            julkaistu_amount: 0,
            arkistoitu_amount: 0,
          };
        }
        target[part].julkaistu_amount += julkaistu_amount;
        target[part].arkistoitu_amount += arkistoitu_amount;
        previousPartObj = target[part];
      });
    }
    return result;
  }, {});

  return {
    by_tila: {
      julkaistu_amount: sumBy(rows, (row: DbRowBase) =>
        Number(row.julkaistu_amount)
      ),
      arkistoitu_amount: sumBy(rows, (row: DbRowBase) =>
        Number(row.arkistoitu_amount)
      ),
      ...(entity === "toteutus"
        ? {
            julkaistu_jotpa_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row.julkaistu_jotpa_amount ?? 0)
            ),
            arkistoitu_jotpa_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row?.arkistoitu_jotpa_amount ?? 0)
            ),
            julkaistu_taydennyskoulutus_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row.julkaistu_taydennyskoulutus_amount ?? 0)
            ),
            arkistoitu_taydennyskoulutus_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row?.arkistoitu_taydennyskoulutus_amount ?? 0)
            ),          
            julkaistu_tyovoimakoulutus_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row.julkaistu_tyovoimakoulutus_amount ?? 0)
            ),
            arkistoitu_tyovoimakoulutus_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row?.arkistoitu_tyovoimakoulutus_amount ?? 0)
            ),          }
        : {}),
    },
    [dataKeyName]: countsBySubKey,
  };
};

export const getPulssiAmounts = async (pulssiDbPool: Pool, entity: EntityType) => {
  const res = await queryPulssiAmounts(pulssiDbPool, entity);
  return dbQueryResultToPulssiData(res, entity);
};

export const getPulssiHistoryAmounts = async (pulssiDbPool: Pool, entity: EntityType, start: String, end: String) => {
  const res = await queryPulssiAmounts(pulssiDbPool, entity);
  return dbQueryResultToPulssiData(res, entity);
};

