import { Handler } from "aws-lambda";
import { Pool } from "pg";
import { Client as ElasticClient } from "@elastic/elasticsearch";
// Käytetään lambda-ympäristön aws-sdk:a. Ei toimi ESM-importilla, joten täytyy käyttää requirea
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SSM = require("aws-sdk/clients/ssm");

const ssm = new SSM();

const getSSMParam = async (param?: string) => {
  if (param == null) {
    return undefined;
  }
  try {
    const result = await ssm
      .getParameter({
        Name: param,
        WithDecryption: true,
      })
      .promise();
    return result.Parameter?.Value;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

const DEFAULT_DB_POOL_PARAMS = {
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
};
const connectKoutaDb = async () => {
  const KOUTA_DB_USER = await getSSMParam(process.env.KOUTA_POSTGRES_RO_USER);
  const KOUTA_DB_PASSWORD = await getSSMParam(
    process.env.KOUTA_POSTGRES_RO_PASSWORD
  );

  const pool = new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: `kouta.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: "kouta",
    user: KOUTA_DB_USER,
    password: KOUTA_DB_PASSWORD,
  });

  return pool.connect();
};

const connectPulssiDb = async () => {
  const PULSSI_DB_USER = await getSSMParam(
    process.env.TARJONTAPULSSI_POSTGRES_APP_USER
  );
  const PULSSI_DB_PASSWORD = await getSSMParam(
    process.env.TARJONTAPULSSI_POSTGRES_APP_PASSWORD
  );

  const pool = new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: "tarjontapulssi",
    user: PULSSI_DB_USER,
    password: PULSSI_DB_PASSWORD,
  });

  return pool.connect();
};

const connectElastic = async () => {
  const ELASTIC_URL_WITH_CREDENTIALS = await getSSMParam(
    process.env.KOUTA_ELASTIC_URL_WITH_CREDENTIALS
  );

  return new ElasticClient({
    node: ELASTIC_URL_WITH_CREDENTIALS,
  });
};

const pulssiClient = await connectPulssiDb();
const elasticClient = await connectElastic();

const entityTypes = ["koulutus", "toteutus", "hakukohde", "haku"] as const;
type EntityType = typeof entityTypes[number];

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

const getCounts = async (entity: EntityType) => {
  const res = await queryCountsFromElastic(entity);

  const tilaBuckets = res.body?.aggregations?.by_tila?.buckets ?? [];

  const countsByTila = tilaBuckets.reduce((result: any, tilaAgg: any) => {
    const subBuckets =
      tilaAgg?.[entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path"]
        ?.buckets ?? [];

    const countsByTyyppi = subBuckets.reduce((acc: any, node: any) => {
      const count = node.doc_count;

      if (entity === "haku") {
        acc[node.key] = {
          _count: count,
        };
      } else {
        const ktParts = node.key.split("/");
        const previousPart: string | null = null;

        ktParts.forEach((part: string) => {
          if (previousPart) {
            acc[previousPart]._child = part;
          }
          if (!acc[part]) {
            acc[part] = {
              _count: 0,
            };
          }
          acc[part]._parent = previousPart;
          acc[part]._count += count;
        });
      }
      return acc;
    }, {});
    result[tilaAgg.key] = {
      _count: tilaAgg.doc_count,
      ...countsByTyyppi,
    };
    return result;
  }, {});

  return {
    _count: res?.body?.hits?.total?.value ?? 0,
    ...countsByTila,
  };
};

const countsFromElasticToDb = async (entity: EntityType) => {
  const elasticRes = await queryCountsFromElastic(entity);

  const tilaBuckets = elasticRes.body?.aggregations?.by_tila?.buckets ?? [];

  const subAggName =
    entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";

  const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";

  // TODO: Ajetaan kaikkien entiteettien datan päivitykset yhdessä transaktiossa
  try {
    await pulssiClient.query("BEGIN;");
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
    await pulssiClient.query("COMMIT;");
  } catch (e) {
    console.log("ROLLBACK");
    await pulssiClient.query("ROLLBACK;");
    console.error(e);
  }
};

export const main: Handler = async (event, context, callback) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to use pool

  try {
    return await Promise.allSettled(
      entityTypes.map((entity) => countsFromElasticToDb(entity))
    );
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    //koutaClient.release(true);
    //pulssiClient.release(true)
  }
};
