import { ApiHandler } from "sst/node/api";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { DEFAULT_DB_POOL_PARAMS } from "../../shared/dbUtils";
import { Pool } from "pg";
import { getCurrentAmountDataFromDb, getHistoryDataFromDb } from "./pulssiDbAccessor";

const ssm = new SSMClient({ region: process.env.AWS_REGION });

const getSsmParameter = async (paramName: string | undefined) => {
  const command = new GetParameterCommand({ Name: paramName, WithDecryption: true });
  const result = await ssm.send(command);
  return result.Parameter?.Value;
};

const dbUsername = await getSsmParameter(process.env.TARJONTAPULSSI_POSTGRES_APP_USER);
const dbPassword = await getSsmParameter(process.env.TARJONTAPULSSI_POSTGRES_APP_PASSWORD);

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: process.env.TARJONTAPULLSSI_POSTGRES_ADDRESS,
  database: "tarjontapulssi",
  user: dbUsername,
  password: dbPassword,
});

export const handler = ApiHandler(async (evt) => {
  //const result = await pulssiDbPool.query("select to_char(now(), 'DD.MM.YYYY HH24:MI TZH')");
  const startTimestamp = evt.queryStringParameters?.start;
  const endTimestamp = evt.queryStringParameters?.end;
  const historyParam = evt.queryStringParameters?.history;
  const result = historyParam ? await getHistoryDataFromDb(pulssiDbPool, startTimestamp, endTimestamp) : await getCurrentAmountDataFromDb(pulssiDbPool);
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
});