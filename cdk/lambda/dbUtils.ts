import { getSSMParam } from "./awsUtils";
import { Pool, PoolClient } from "pg";
import { EntityType, Julkaisutila, ToteutusRow } from "../shared/types";
import {
  AggregationsFilterAggregate,
} from "@elastic/elasticsearch/api/types";
import {
  bucketsToArr,
  getSubBuckets,
  SearchResultsByEntity,
} from "./elasticUtils";

export const DEFAULT_DB_POOL_PARAMS = {
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  port: 5432,
};

export type DbRowBase = {
  tila: Julkaisutila;
  julkaistu_amount: number;
  arkistoitu_amount: number;
  julkaistu_jotpa_amount?: number;
  arkistoitu_jotpa_amount?: number;
};

export const createPulssiDbPool = async () => {
  const pulssiDbUser = await getSSMParam(
    process.env.TARJONTAPULSSI_POSTGRES_APP_USER
  );

  const pulssiDbPassword = await getSSMParam(
    process.env.TARJONTAPULSSI_POSTGRES_APP_PASSWORD
  );

  return new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: "tarjontapulssi",
    user: pulssiDbUser,
    password: pulssiDbPassword,
  });
};

const createTilaAmountCol = (entity: EntityType, tila: Julkaisutila) => {
  let col = `coalesce(sum(amount) filter(where tila = '${tila}'), 0) as ${tila}_amount`;
  if (entity === "toteutus") {
    col += `, coalesce(sum(jotpa_amount) filter(where tila = '${tila}'), 0) as ${tila}_jotpa_amount`;
  }
  return col;
};

export const queryPulssiAmounts = async (
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
      entity === "toteutus" ? ", jotpa_amount" : ""
    }`
  );
};

const toteutusRowHasChanged = (row1: ToteutusRow, row2: ToteutusRow) => {
  return row1.amount !== row2.amount || row1.jotpa_amount !== row2.jotpa_amount;
};

const saveToteutusAmounts = async (
  pulssiClient: PoolClient,
  existingRow: ToteutusRow,
  newRow: ToteutusRow
) => {
  if (existingRow) {
    if (toteutusRowHasChanged(existingRow, newRow)) {
      console.log(
        `Updating changed toteutus amounts (${newRow.tila}, ${newRow.tyyppi_path}) = ${newRow.amount} (jotpa = ${newRow.jotpa_amount})`
      );

      await pulssiClient.query(
        `UPDATE toteutus_amounts SET amount = ${newRow.amount}, jotpa_amount = ${newRow.jotpa_amount} WHERE tila = '${newRow.tila}' AND tyyppi_path = '${newRow.tyyppi_path}'`
      );
    }
  } else {
    console.log(
      `Inserting toteutus amounts (${newRow.tila}, ${newRow.tyyppi_path}) = ${newRow.amount} (jotpa = ${newRow.jotpa_amount})`
    );
    await pulssiClient.query(
      `INSERT INTO toteutus_amounts(tyyppi_path, tila, amount, jotpa_amount) values('${newRow.tyyppi_path}', '${newRow.tila}', ${newRow.amount}, ${newRow.jotpa_amount})`
    );
  }
};

export const savePulssiAmounts = async (
  pulssiClient: PoolClient,
  searchResultsByEntity: SearchResultsByEntity
) => {
  try {
    await pulssiClient.query("BEGIN");
    for (const [entity, elasticResBody] of Object.entries(
      searchResultsByEntity
    )) {
      const subAggName =
        entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";

      const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";

      const tilaBuckets = bucketsToArr(
        elasticResBody?.aggregations?.by_tila?.buckets
      );

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
              (subBucket?.has_jotpa as AggregationsFilterAggregate)
                ?.doc_count ?? 0
            );

            await saveToteutusAmounts(pulssiClient, existingRow, {
              tyyppi_path: subBucket.key,
              tila,
              amount,
              jotpa_amount: jotpaAmount,
            });
          } else {
            if (existingRow) {
              // Ei päivitetä kantaa, jos luku ei ole muuttunut!
              if (existingRow.amount !== amount) {
                console.log(
                  `Updating changed ${entity} amount (${tila}, ${subBucket.key}) = ${amount}`
                );
                await pulssiClient.query(
                  `UPDATE ${entity}_amounts SET amount = ${amount} WHERE tila = '${tila}' AND ${subAggColumn} = '${subBucket.key}'`
                );
              }
            } else {
              console.log(
                `Inserting ${entity} amount (${tila}, ${subBucket.key}) = ${amount}`
              );
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
