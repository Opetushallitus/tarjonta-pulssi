import SSM from 'aws-sdk/clients/ssm'
import { Handler } from 'aws-lambda';

import { Pool } from 'pg';

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

export const main: Handler = async (event, context, callback) => {

  const DB_USER = await getSSMParam(process.env.KOUTA_POSTGRES_RO_USER)
  const DB_PASSWORD = await getSSMParam(process.env.KOUTA_POSTGRES_RO_PASSWORD)
  
  const DB_HOST = 'kouta.db.untuvaopintopolku.fi'
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
      await client.query("SELECT NOW()");
    } finally {
      // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
      client.release(true);
    }
  };