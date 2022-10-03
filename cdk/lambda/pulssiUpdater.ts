import { Handler } from "aws-lambda";
import { Pool, PoolClient } from "pg";
import { Client as ElasticClient } from "@elastic/elasticsearch";
import { getSSMParam, entityTypes, DEFAULT_DB_POOL_PARAMS, getTilaBuckets } from "./shared";

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

const queryCountsFromElastic = async () =>
  elasticClient.msearch({
    body: entityTypes.flatMap((entity) => [
      { index: `${entity}-kouta` },
      {
        size: 0, // Ei haluta hakutuloksia, vain aggsit
        track_total_hits: true, // Halutaan aina tarkka hits-määrä, eikä jotain sinne päin
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
            aggs:
              entity === "haku"
                ? {
                    by_hakutapa: {
                      terms: {
                        field: "hakutapa.koodiUri.keyword",
                        size: 100,
                      },
                    },
                  }
                : {
                    by_koulutustyyppi_path: {
                      terms: {
                        field: "koulutustyyppiPath.keyword",
                        size: 100,
                      },
                    },
                  },
          },
        },
      },
    ]),
  });


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

      const dbSelectRes = (
        await pulssiClient.query(
          `select tila, ${subAggColumn} from ${entity}_amounts group by (tila, ${subAggColumn})`
        )
      )?.rows;

      const tilaBuckets = getTilaBuckets(dbSelectRes, elasticResBody, subAggColumn, subAggName);

      for (const tilaBucket of tilaBuckets) {
        const tila = tilaBucket.key;
        const subBuckets = tilaBucket?.[subAggName]?.buckets ?? [];

        for (const subBucket of subBuckets) {
          const amount = subBucket.doc_count ?? 0;

          const existingRow = (
            await pulssiClient.query(
              `SELECT * from ${entity}_amounts WHERE tila = '${tila}' AND ${subAggColumn} = '${subBucket.key}'`
            )
          )?.rows?.[0];

          if (existingRow) {
            // Ei päivitetä kantaa, jos luku ei ole muuttunut!
            if (Number(existingRow.amount) !== Number(amount)) {
              console.log(
                `Updating changed ${entity} amount: ${tila}, ${subBucket.key} = ${amount}`
              );
              await pulssiClient.query(
                `UPDATE ${entity}_amounts SET amount = ${amount} WHERE tila = '${tila}' AND ${subAggColumn} = '${subBucket.key}'`
              );
            }
          } else {
            console.log(
              `Inserting ${entity} amount: ${tila}, ${subBucket.key} = ${amount}`
            );
            await pulssiClient.query(
              `INSERT INTO ${entity}_amounts(${subAggColumn}, tila, amount) values('${subBucket.key}', '${tila}', ${amount})`
            );
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
    return await countsFromElasticToDb(pulssiClient);
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};
