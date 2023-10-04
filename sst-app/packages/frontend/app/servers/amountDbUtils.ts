import type { Pool } from "pg";
import type { EntityType } from "../../../shared/types";
import { dbQueryResultToPulssiData } from "./amountDataUtils";
import type { DatabaseRow, SubEntitiesByEntities, SubEntityTila } from "./types";

const handleResults = (rows: Array<any>): Array<DatabaseRow> => {
  const asOptionalNumber = (rowValue: any) =>
    rowValue ? Number(rowValue) : undefined;
  return rows.map((row) => ({
    sub_entity: String(row["sub_entity"]),
    tila: String(row["tila"]) as SubEntityTila,
    start_timestamp: String(row["start_timestamp"]),
    amount: Number(row["amount"]),
    jotpa_amount: asOptionalNumber(row["jotpa_amount"]),
    taydennyskoulutus_amount: asOptionalNumber(row["taydennyskoulutus_amount"]),
    tyovoimakoulutus_amount: asOptionalNumber(row["tyovoimakoulutus_amount"]),
  }));
};

export const queryPulssiAmounts = async (
  pulssiDbPool: Pool,
  entity: EntityType
) => {
  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";
  const asAmountField = (fieldName: string) =>
    `coalesce(sum(${fieldName}), 0) as ${fieldName}`;

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
    `select ${primaryColName} as sub_entity, tila, to_char(min(lower(system_time)), 'DD.MM.YYYY HH24:MI') as start_timestamp, ${amountFields}
    from ${entity}_amounts group by ${primaryColName}, tila order by sub_entity`
  );
  return handleResults(dbResult.rows);
};

export const queryMeasuredSubEntityTypesByEntityTypes = async (
  pulssiDbPool: Pool
): Promise<SubEntitiesByEntities> => {
  const dbResult = await pulssiDbPool.query(
    `select distinct tyyppi_path as entity_item, 'koulutus' as entity_type from koulutus_amounts
      union all
    select distinct tyyppi_path as entity_item, 'toteutus' as entity_type from toteutus_amounts
      union all
    select distinct tyyppi_path as entity_item, 'hakukohde' as entity_type from hakukohde_amounts
      union all
    select distinct hakutapa as entity_item, 'haku' as entity_type from haku_amounts;`
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

export const getCurrentPulssiAmounts = async (
  pulssiDbPool: Pool,
  entity: EntityType
) => {
  const rows = await queryPulssiAmounts(pulssiDbPool, entity);
  return dbQueryResultToPulssiData(rows, entity);
};

export const queryPulssiAmountsAtCertainMoment = async (
  pulssiDbPool: Pool,
  entity: EntityType,
  timeStamp: string
) => {
  const amountFields =
    entity === "toteutus"
      ? "amount, jotpa_amount, taydennyskoulutus_amount, tyovoimakoulutus_amount"
      : "amount";
  const subEntityField = entity === "haku" ? "hakutapa" : "tyyppi_path";

  const sql = `select ${subEntityField} as sub_entity, tila, to_char(lower(system_time), 'DD.MM.YYYY HH24:MI') as start_timestamp, ${amountFields} 
    from ${entity}_amounts_history where (${subEntityField}, tila, upper(system_time)) in (
      select ${subEntityField}, tila, min(upper(system_time)) from ${entity}_amounts_history
      where upper(system_time) >= to_timestamp(${timeStamp},'DD.MM.YYYY HH24:MI') group by ${subEntityField}, tila)`;

  const dbResult = await pulssiDbPool.query(sql);
  return handleResults(dbResult.rows);
};
