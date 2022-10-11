import { Handler } from "aws-lambda";
import { Pool, PoolClient } from "pg";
import { Client as ElasticClient } from "@elastic/elasticsearch";
import {
  getSSMParam,
  entityTypes,
  DEFAULT_DB_POOL_PARAMS,
  getTilaBuckets,
  invokeViewerLambda,
  EntityType,
  ToteutusRow,
  Row,
} from "./shared";

const PULSSI_DB_USER = await getSSMParam(
  process.env.TARJONTAPULSSI_POSTGRES_APP_USER
);
const PULSSI_DB_PASSWORD = await getSSMParam(
  process.env.TARJONTAPULSSI_POSTGRES_APP_PASSWORD
);

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
  port: 5432,
  database: "tarjontapulssi",
  user: PULSSI_DB_USER,
  password: PULSSI_DB_PASSWORD,
});

const connectElastic = async () => {
  const ELASTIC_URL_WITH_CREDENTIALS = await getSSMParam(
    process.env.KOUTA_ELASTIC_URL_WITH_CREDENTIALS
  );

  return new ElasticClient({
    node: ELASTIC_URL_WITH_CREDENTIALS,
  });
};

const elasticClient = await connectElastic();

const DEFAULT_AGGS = {
  by_koulutustyyppi_path: {
    terms: {
      field: "koulutustyyppiPath.keyword",
      size: 100,
    },
  },
};

const AGGS_BY_ENTITY: Record<EntityType, object> = {
  koulutus: DEFAULT_AGGS,
  toteutus: {
    by_koulutustyyppi_path: {
      terms: {
        field: "koulutustyyppiPath.keyword",
        size: 100,
      },
      aggs: {
        has_jotpa: {
          filter: {
            term: {
              "metadata.hasJotpaRahoitus": true,
            },
          },
        },
      },
    },
  },
  hakukohde: DEFAULT_AGGS,
  haku: {
    by_hakutapa: {
      terms: {
        field: "hakutapa.koodiUri.keyword",
        size: 100,
      },
    },
  },
} as const;

const queryCountsFromElastic = async () =>
  elasticClient.msearch({
    body: entityTypes.flatMap((entity) => [
      { index: `${entity}-kouta` },
      {
        size: 0, // Ei haluta hakutuloksia, vain aggsit
        query: {
          terms: {
            tila: ["julkaistu", "arkistoitu"],
          },
        },
        aggs: {
          by_tila: {
            terms: {
              field: "tila.keyword",
              size: 10,
            },
            aggs: AGGS_BY_ENTITY[entity],
          },
        },
      },
    ]),
  });

const toteutusRowHasChanged = (row1: ToteutusRow, row2: ToteutusRow) => {
  return row1.amount !== row2.amount || row1.jotpa_amount !== row2.jotpa_amount
};

const saveToteutusAmounts = async (
  pulssiClient: PoolClient,
  existingRow: ToteutusRow,
  newRow: ToteutusRow
) => {
  if (existingRow) {
    if (toteutusRowHasChanged(existingRow, newRow)) {
      console.log(`Updating changed toteutus amounts (${newRow.tila}, ${newRow.tyyppi_path}) = ${newRow.amount} (jotpa = ${newRow.jotpa_amount})`)

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

const countsFromElasticToDb = async (pulssiClient: PoolClient) => {
  const msearchRes = await queryCountsFromElastic();

  try {
    await pulssiClient.query("BEGIN");
    for (let index = 0; index < entityTypes.length; ++index) {
      const entity = entityTypes[index];
      const elasticResBody = msearchRes.body.responses?.[index];

      const subAggName =
        entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";

      const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";

      const dbGroupByResRows =
        (
          await pulssiClient.query(
            `select tila, ${subAggColumn} from ${entity}_amounts group by (tila, ${subAggColumn})`
          )
        )?.rows ?? [];

      const tilaBuckets = getTilaBuckets(
        dbGroupByResRows,
        elasticResBody,
        subAggName
      );

      for (const tilaBucket of tilaBuckets) {
        const tila = tilaBucket.key;
        const subBuckets = tilaBucket?.[subAggName]?.buckets ?? [];

        for (const subBucket of subBuckets) {
          const amount = Number(subBucket.doc_count ?? 0);

          const existingRow = (
            await pulssiClient.query(
              `SELECT * from ${entity}_amounts WHERE tila = '${tila}' AND ${subAggColumn} = '${subBucket.key}'`
            )
          )?.rows?.[0];

          if (entity === "toteutus") {
            const jotpaAmount = Number(subBucket?.has_jotpa?.doc_count ?? 0);

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

export const main: Handler = async (event, context, callback) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to use pool

  const pulssiClient = await pulssiDbPool.connect();

  try {
    await countsFromElasticToDb(pulssiClient);
    await invokeViewerLambda();
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};
