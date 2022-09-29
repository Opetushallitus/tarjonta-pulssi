import { Handler } from 'aws-lambda';
import { Pool } from 'pg';
import { Client as ElasticClient } from '@elastic/elasticsearch'

// Käytetään lambda-ympäristön aws-sdk:a. Ei toimi ESM-importilla, joten täytyy käyttää requirea
const SSM = require('aws-sdk/clients/ssm')

const ssm = new SSM()

const getSSMParam = async (param?: string) => {
  if (param == null) {
    return undefined;
  }
  try {
    const result = (await ssm.getParameter( {
      Name: param,
      WithDecryption: true
    }).promise())
    return result.Parameter?.Value
  } catch (e) {
    console.error(e)
    return undefined
  }
}


const DEFAULT_DB_POOL_PARAMS = {
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,

}
const connectKoutaDb = async () => {
  const KOUTA_DB_USER = await getSSMParam(process.env.KOUTA_POSTGRES_RO_USER)
  const KOUTA_DB_PASSWORD = await getSSMParam(process.env.KOUTA_POSTGRES_RO_PASSWORD)

  const pool = new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: `kouta.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: 'kouta',
    user: KOUTA_DB_USER,
    password: KOUTA_DB_PASSWORD,
  });

  return pool.connect()
}

const connectPulssiDb = async () => {
  const PULSSI_DB_USER = await getSSMParam(process.env.TARJONTAPULSSI_POSTGRES_APP_USER)
  const PULSSI_DB_PASSWORD = await getSSMParam(process.env.TARJONTAPULSSI_POSTGRES_APP_PASSWORD)

  const pool = new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: 'tarjontapulssi',
    user: PULSSI_DB_USER,
    password: PULSSI_DB_PASSWORD,
  });

  return pool.connect()
}

const connectElastic = async () => {
  const ELASTIC_URL_WITH_CREDENTIALS = await getSSMParam(process.env.KOUTA_ELASTIC_URL_WITH_CREDENTIALS)

  return new ElasticClient({
    node: ELASTIC_URL_WITH_CREDENTIALS,
  })
}

type EntityType = "koulutus" | "toteutus" | "hakukohde" | "haku"

const getCounts = async (elasticClient: ElasticClient, entity: EntityType) => {
  const aggs = {
        "by_tila": {
          "terms": {
            "field": "tila.keyword",
            "size": 10,
          },
          "aggs": entity === "haku"
          ? {
            "by_hakutapa": {
              "terms": {
                "field": "hakutapa.koodiUri.keyword",
                "size": 100
              }
            }
          }
          : {
            "by_koulutustyyppi_path": {
              "terms": {
                "field": "koulutustyyppiPath.keyword",
                "size": 100
              }
            }
          }
        }
      }

    const res = await elasticClient.search({
      index: `${entity}-kouta`,
      body: {
        "_source": false, // Halutaan vain aggsit, ei _source:a
        "size": 0, // ...eikä hitsejä
        "track_total_hits": true, // Halutaan aina tarkka hits-määrä, eikä jotain sinne päin
        "query": {
          "terms": {
            tila: ['julkaistu', 'arkistoitu']
          }
        },
        aggs,
      }
    })

    const tilaBuckets = res.body?.aggregations?.by_tila?.buckets ?? [];

    const countsByTila = tilaBuckets.reduce((result: any, tilaAgg: any) => {

      const subBuckets = tilaAgg?.[(entity === 'haku' ? 'by_hakutapa' : 'by_koulutustyyppi_path')]?.buckets ?? []

      const countsByTyyppi = subBuckets.reduce((acc: any, node: any) => {
        const count = node.doc_count

        if (entity === 'haku') {
          acc[node.key] = {
            _count: count
          }
        } else {
          const ktParts = node.key.split('/')
          let previousPart: any = null
    
          ktParts.forEach((part: string, i: number) => {
            if (previousPart) {
              acc[previousPart]._child = part
            }
            if (!acc[part]) {
              acc[part] = {
                _count: 0
              }
            }
            acc._parent = previousPart
            acc[part]._count += count
          })
        }
        return acc
      }, {})
      result[tilaAgg.key] = {
        _count: tilaAgg.doc_count,
        ...countsByTyyppi
      }
      return result
    }, {})

    return {
      _count: res?.body?.hits?.total?.value ?? 0,
      ...countsByTila,
    }
}

const koutaClient = await connectKoutaDb()
const elasticClient = await connectElastic()

export const main: Handler = async (event, context, callback) => {

    // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
    context.callbackWaitsForEmptyEventLoop = false; // !important to use pool
    //const pulssiClient = await connectPulssiDb()
    
    try {
      return {
          koulutus: await getCounts(elasticClient, 'koulutus'),
          toteutus: await getCounts(elasticClient, 'toteutus'),
          hakukohde: await getCounts(elasticClient, 'hakukohde'),
          haku: await getCounts(elasticClient, 'haku')
      }
    } finally {
      // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
      //koutaClient.release(true);
      //pulssiClient.release(true)
    }
  };