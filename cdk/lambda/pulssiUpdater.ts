import { Handler } from "aws-lambda";
import { invokePublisherLambda } from "./awsUtils";
import {
  connectElastic,
} from "./elasticUtils";
import { createPulssiDbPool } from "./dbUtils";
import { saveAmountsFromElasticToDb } from "./pulssiUpdaterUtils";

const elasticClient = await connectElastic();
const pulssiDbPool = await createPulssiDbPool();


export const main: Handler = async (event, context, callback) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to use pool

  const pulssiClient = await pulssiDbPool.connect();

  try {
    await saveAmountsFromElasticToDb(elasticClient, pulssiClient);
    await invokePublisherLambda();
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};
