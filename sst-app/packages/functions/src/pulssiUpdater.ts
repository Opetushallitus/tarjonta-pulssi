import { Handler } from "aws-lambda";
import {
  connectElastic,
} from "../../shared/elasticUtils";
import { createPulssiDbPool } from "../../shared/dbUtils";
import { saveAmountsFromElasticToDb } from "../../shared/pulssiUpdaterUtils";

const elasticClient = await connectElastic();
const pulssiDbPool = await createPulssiDbPool();


export const main: Handler = async (event, context, callback) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to use pool

  const pulssiClient = await pulssiDbPool.connect();

  try {
    await saveAmountsFromElasticToDb(elasticClient, pulssiClient);
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};