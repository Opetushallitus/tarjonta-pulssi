import type { Pool } from "pg";

import { dbQueryResultToPulssiData } from "../shared/amountDataUtils";
import type { DatabaseRow, EntityType, Julkaisutila } from "../shared/types";

const asOptionalNumber = (rowValue?: string | number) => (rowValue ? Number(rowValue) : undefined);

// TODO: Tyypitys!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleResults = (rows: Array<any>): Array<DatabaseRow> => {
  return rows.map((row) => ({
    sub_entity: String(row["sub_entity"]),
    tila: String(row["tila"]) as Julkaisutila,
    start_timestamp: row["start_timestamp"],
    amount: Number(row["amount"]),
    jotpa_amount: asOptionalNumber(row["jotpa_amount"]),
    taydennyskoulutus_amount: asOptionalNumber(row["taydennyskoulutus_amount"]),
    tyovoimakoulutus_amount: asOptionalNumber(row["tyovoimakoulutus_amount"]),
  }));
};

export const queryPulssiAmounts = async (pulssiDbPool: Pool, entity: EntityType) => {
  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";
  const asAmountField = (fieldName: string) => `coalesce(sum(${fieldName}), 0) as ${fieldName}`;

  const amountFields =
    entity === "toteutus"
      ? [
          asAmountField("amount"),
          asAmountField("jotpa_amount"),
          asAmountField("taydennyskoulutus_amount"),
          asAmountField("tyovoimakoulutus_amount"),
        ].join(", ")
      : asAmountField("amount");
  const dbResult = await pulssiDbPool.query(
    `select ${primaryColName} as sub_entity, tila, min(lower(system_time)) as start_timestamp, ${amountFields}
    from ${entity}_amounts group by ${primaryColName}, tila order by sub_entity`
  );
  return handleResults(dbResult.rows);
};

export const queryAllSubentityTypesByEntityTypes = async (pulssiDbPool: Pool) => {
  const dbResult = await pulssiDbPool.query(
    `select distinct tyyppi_path as entity_item, 'koulutukset' as entity_type from koulutus_amounts
      union all
    select distinct tyyppi_path as entity_item, 'toteutukset' as entity_type from toteutus_amounts
      union all
    select distinct tyyppi_path as entity_item, 'hakukohteet' as entity_type from hakukohde_amounts
      union all
    select distinct hakutapa as entity_item, 'haut' as entity_type from haku_amounts;`
  );

  return dbResult.rows.reduce((result, row) => {
    if (result[row.entity_type]) {
      result[row.entity_type].push(row.entity_item);
    } else {
      result[row.entity_type] = [row.entity_item];
    }
    return result;
  }, {});
};

export const getCurrentPulssiAmounts = async (pulssiDbPool: Pool, entity: EntityType) => {
  const rows = await queryPulssiAmounts(pulssiDbPool, entity);
  return dbQueryResultToPulssiData(rows, entity);
};

export const queryPulssiAmountsAtCertainMoment = async (
  pulssiDbPool: Pool,
  entity: EntityType,
  timeLimit: Date | null
) => {
  const amountFields =
    entity === "toteutus"
      ? "amount, jotpa_amount, taydennyskoulutus_amount, tyovoimakoulutus_amount"
      : "amount";
  const subEntityField = entity === "haku" ? "hakutapa" : "tyyppi_path";
  const timeLimitCondition = timeLimit ? `where upper(system_time) >= $1` : "";

  const sql = `select ${subEntityField} as sub_entity, tila, lower(system_time) as start_timestamp, ${amountFields} 
    from ${entity}_amounts_history where (${subEntityField}, tila, upper(system_time)) in (
      select ${subEntityField}, tila, min(upper(system_time)) from ${entity}_amounts_history
      ${timeLimitCondition}
      group by ${subEntityField}, tila) order by sub_entity`;

  const dbResult = timeLimit
    ? await pulssiDbPool.query(sql, [timeLimit])
    : await pulssiDbPool.query(sql);
  return handleResults(dbResult.rows);
};
