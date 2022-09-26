import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import { Handler } from 'aws-lambda';
import { Client, Pool, PoolClient } from 'pg';

const ssmClient = new SSMClient({})

const getSSMParam = async (param?: string) => {
  if (param == null) {
    return undefined;
  }
  try {
    const result = await ssmClient.send(new GetParameterCommand({
      Name: param,
      WithDecryption: true
    }))
    return result.Parameter?.Value
  } catch (e) {
    console.error(e)
    return undefined
  }
}

const dbUserPromise = getSSMParam(process.env.KOUTA_POSTGRES_RO_USER)
const dbPasswordPromise = getSSMParam(process.env.KOUTA_POSTGRES_RO_PASSWORD)

type TableName = 'toteutukset' | 'koulutukset' | 'hakukohteet' | 'haut'

const getJulkaistut = async (client: PoolClient, tableName: TableName) => {

  // TODO: Ei toimi hauille ja hakukohteille, koska niiden metadatassa ei ole tyyppiä!
 const rows = (await client.query(`SELECT metadata #>> '{tyyppi}' as tyyppi, count(*) as count from ${tableName} where tila = 'julkaistu'::Julkaisutila GROUP BY ROLLUP(metadata #>> '{tyyppi}')` )).rows ?? []

 return Object.fromEntries(rows.map(({tyyppi, count}) => [tyyppi ?? '*', count]))
}

export const main: Handler = async (event, context, callback) => {
  const DB_USER = await dbUserPromise
  const DB_PASSWORD = await dbPasswordPromise
  
  const DB_HOST = `kouta.db.${process.env.PUBLICHOSTEDZONE}`
  const DB_PORT = 5432
  
  const pool = new Pool({
      max: 1,
      min: 0,
      idleTimeoutMillis: 120000,
      connectionTimeoutMillis: 10000,
      host: DB_HOST,
      port: DB_PORT,
      database: 'kouta',
      user: DB_USER,
      password: DB_PASSWORD,
  });

    // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
    context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool
    const client = await pool.connect();
    
    try {
      return {
        julkaistutKoulutukset: await getJulkaistut(client, 'koulutukset'),
        julkaistutToteutukset: await getJulkaistut(client, 'toteutukset'),
      }
    } finally {
      // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
      client.release(true);
    }
  };