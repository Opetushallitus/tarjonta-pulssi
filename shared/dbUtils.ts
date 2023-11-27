import type { AggregationsFilterAggregate } from "@elastic/elasticsearch/api/types";
import { Pool } from "pg";
import type { PoolClient, PoolConfig } from "pg";

import { getSSMParam } from "./awsUtils";
import type { SearchResultsByEntity } from "./elasticUtils";
import { bucketsAsArr, getSubBuckets } from "./elasticUtils";
import type { Julkaisutila, ToteutusRow } from "./types";

export const DEFAULT_DB_POOL_PARAMS = {
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  port: 5432,
};

export interface DbRowBase {
  tila: Julkaisutila;
  julkaistu_amount: number;
  arkistoitu_amount: number;
  julkaistu_jotpa_amount?: number;
  arkistoitu_jotpa_amount?: number;
  julkaistu_taydennyskoulutus_amount?: number;
  arkistoitu_taydennyskoulutus_amount?: number;
  julkaistu_tyovoimakoulutus_amount?: number;
  arkistoitu_tyovoimakoulutus_amount?: number;
}

export const createPulssiDbPool = async (additionalParams: Partial<PoolConfig> = {}) => {
  const pulssiDbUser = await getSSMParam(process.env.TARJONTAPULSSI_POSTGRES_APP_USER);

  const pulssiDbPassword = await getSSMParam(process.env.TARJONTAPULSSI_POSTGRES_APP_PASSWORD);

  return new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: "tarjontapulssi",
    user: pulssiDbUser,
    password: pulssiDbPassword,
    ...additionalParams,
  });
};

export const toteutusRowHasChanged = (existingRow: ToteutusRow, newRow: ToteutusRow) => {
  return (
    Number(existingRow.amount) !== newRow.amount ||
    Number(existingRow.jotpa_amount) !== newRow.jotpa_amount ||
    Number(existingRow.taydennyskoulutus_amount) !== newRow.taydennyskoulutus_amount ||
    Number(existingRow.tyovoimakoulutus_amount) !== newRow.tyovoimakoulutus_amount
  );
};

const saveToteutusAmounts = async (
  pulssiClient: PoolClient,
  existingRow: ToteutusRow,
  newRow: ToteutusRow
) => {
  if (existingRow) {
    if (toteutusRowHasChanged(existingRow, newRow)) {
      console.log(
        `Updating changed toteutus amounts (${newRow.tila}, ${newRow.tyyppi_path}) = ${newRow.amount} (jotpa = ${newRow.jotpa_amount}, taydennyskoulutus = ${newRow.taydennyskoulutus_amount}, tyovoimakoulutus = ${newRow.tyovoimakoulutus_amount})`
      );

      await pulssiClient.query(
        `UPDATE toteutus_amounts SET amount = ${newRow.amount}, jotpa_amount = ${newRow.jotpa_amount}, 
        taydennyskoulutus_amount = ${newRow.taydennyskoulutus_amount}, tyovoimakoulutus_amount = ${newRow.tyovoimakoulutus_amount}  
        WHERE tila = '${newRow.tila}' AND tyyppi_path = '${newRow.tyyppi_path}'`
      );
    }
  } else {
    console.log(
      `Inserting toteutus amounts (${newRow.tila}, ${newRow.tyyppi_path}) = ${newRow.amount} (jotpa = ${newRow.jotpa_amount}, taydennyskoulutus = ${newRow.taydennyskoulutus_amount}, tyovoimakoulutus = ${newRow.tyovoimakoulutus_amount})`
    );
    await pulssiClient.query(
      `INSERT INTO toteutus_amounts(tyyppi_path, tila, amount, jotpa_amount, taydennyskoulutus_amount, tyovoimakoulutus_amount) 
      values('${newRow.tyyppi_path}', '${newRow.tila}', ${newRow.amount}, ${newRow.jotpa_amount}, ${newRow.taydennyskoulutus_amount}, ${newRow.tyovoimakoulutus_amount})`
    );
  }
};

export const savePulssiAmounts = async (
  pulssiClient: PoolClient,
  searchResultsByEntity: SearchResultsByEntity
) => {
  try {
    await pulssiClient.query("BEGIN");
    for (const [entity, elasticResBody] of Object.entries(searchResultsByEntity)) {
      const subAggName = entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";

      const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";

      const tilaBuckets = bucketsAsArr(elasticResBody?.aggregations?.by_tila?.buckets);

      for (const tilaBucket of tilaBuckets) {
        const tila = tilaBucket.key as Julkaisutila;
        const subBuckets = getSubBuckets(tilaBucket, subAggName);

        for (const subBucket of subBuckets) {
          const amount = Number(subBucket.doc_count ?? 0);

          const existingRow = (
            await pulssiClient.query(
              `SELECT * from ${entity}_amounts WHERE tila = '${tila}' AND ${subAggColumn} = '${subBucket.key}'`
            )
          )?.rows?.[0];

          if (entity === "toteutus") {
            const jotpaAmount = Number(
              (subBucket?.has_jotpa as AggregationsFilterAggregate)?.doc_count ?? 0
            );

            const taydennyskoulutusAmount = Number(
              (subBucket?.is_taydennyskoulutus as AggregationsFilterAggregate)?.doc_count ?? 0
            );

            const tyovoimakoulutusAmount = Number(
              (subBucket?.is_tyovoimakoulutus as AggregationsFilterAggregate)?.doc_count ?? 0
            );

            await saveToteutusAmounts(pulssiClient, existingRow, {
              tyyppi_path: subBucket.key,
              tila,
              amount,
              jotpa_amount: jotpaAmount,
              taydennyskoulutus_amount: taydennyskoulutusAmount,
              tyovoimakoulutus_amount: tyovoimakoulutusAmount,
            });
          } else {
            if (existingRow) {
              // Ei päivitetä kantaa, jos luku ei ole muuttunut!
              if (Number(existingRow.amount) !== amount) {
                console.log(
                  `Updating changed ${entity} amount (${tila}, ${subBucket.key}) = ${amount}`
                );
                await pulssiClient.query(
                  `UPDATE ${entity}_amounts SET amount = ${amount} WHERE tila = '${tila}' AND ${subAggColumn} = '${subBucket.key}'`
                );
              }
            } else {
              console.log(`Inserting ${entity} amount (${tila}, ${subBucket.key}) = ${amount}`);
              await pulssiClient.query(
                `INSERT INTO ${entity}_amounts(${subAggColumn}, tila, amount) values('${subBucket.key}', '${tila}', ${amount})`
              );
            }
          }
        }
      }
    }
    await pulssiClient.query("COMMIT");
  } catch (e) {
    console.log("ROLLBACK");
    await pulssiClient.query("ROLLBACK");
    console.error(e);
  }
};
