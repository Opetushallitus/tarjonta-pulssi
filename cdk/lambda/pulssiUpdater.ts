import { Handler } from "aws-lambda";
import { Pool, PoolClient } from "pg";
import { Client as ElasticClient } from "@elastic/elasticsearch";
import { getSSMParam, entityTypes, DEFAULT_DB_POOL_PARAMS } from "./shared";
import type { EntityType } from "./shared";

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

const queryCountsFromElastic = async (entity: EntityType) => {
  const aggs = {
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
  };

  return await elasticClient.search({
    index: `${entity}-kouta`,
    body: {
      _source: false, // Halutaan vain aggsit, ei _source:a
      size: 0, // ...eikä hitsejä
      track_total_hits: true, // Halutaan aina tarkka hits-määrä, eikä jotain sinne päin
      query: {
        terms: {
          tila: ["julkaistu", "arkistoitu"],
        },
      },
      aggs,
    },
  });
};

const countsFromElasticToDb = async (
  pulssiClient: PoolClient,
  entity: EntityType
) => {
  const elasticRes = await queryCountsFromElastic(entity);

  const tilaBuckets = elasticRes.body?.aggregations?.by_tila?.buckets ?? [];

  const subAggName =
    entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";

  const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";

  // TODO: Ajetaan kaikkien entiteettien datan päivitykset yhdessä transaktiossa
  try {
    await pulssiClient.query("BEGIN");
    const rows = (
      await pulssiClient.query(
        `select tila, ${subAggColumn} from ${entity}_amounts group by (tila, ${subAggColumn})`
      )
    )?.rows;
    // Asetetaan nollaksi aggregaatioiden luvut, jotka löytyy kannasta, mutta ei elasticista.
    // Bucketteja voi kadota, jos entiteettejä muokataan. Tarvitsee nollata, jotta kantaan ei jää haamu-lukuja sotkemaan.
    rows.forEach((row) => {
      const subBuckets = tilaBuckets?.find(
        (v: { key: string }) => v.key === row.tila
      )?.buckets;
      const subBucket = subBuckets?.find(
        (v: { key: string }) => v.key === row?.[subAggColumn]
      );
      if (Array.isArray(subBuckets) && !subBucket) {
        subBuckets.push({
          key: row[subAggColumn],
          doc_count: 0,
        });
      }
    });

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
    return await Promise.allSettled(
      entityTypes.map((entity) => countsFromElasticToDb(pulssiClient, entity))
    );
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};
