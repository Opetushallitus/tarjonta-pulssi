import { Handler } from "aws-lambda";
import { PoolClient } from "pg";
import { invokeViewerLambda } from "./awsUtils";
import { Client as ElasticSearchClient } from "@elastic/elasticsearch";
import {
  connectElastic,
  getAmountsFromElastic,
  initializeSubBuckets,
} from "./elasticUtils";
import { createPulssiDbPool, savePulssiAmounts } from "./dbUtils";
import { ENTITY_TYPES } from "../shared/constants";

const elasticClient = await connectElastic();
const pulssiDbPool = await createPulssiDbPool();

const initializeEntityBuckets = async (pulssiClient, mSearchRes) => {
  const searchResultsByEntity = {};

  for (let index = 0; index < ENTITY_TYPES.length; ++index) {
    const entity = ENTITY_TYPES[index];
    const elasticResBody = mSearchRes.body.responses?.[index];
    const subAggName =
      entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";
    const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";
    const dbGroupByResRows =
      (
        await pulssiClient.query(
          `select tila, ${subAggColumn} from ${entity}_amounts group by (tila, ${subAggColumn})`
        )
      )?.rows ?? [];

    searchResultsByEntity[entity] = initializeSubBuckets(
      dbGroupByResRows,
      elasticResBody,
      subAggName
    );
  }
  return searchResultsByEntity;
};

const saveAmountsFromElasticToDb = async (
  elasticClient: ElasticSearchClient,
  pulssiClient: PoolClient
) => {
  const searchResultsByEntity = await getAmountsFromElastic(elasticClient);
  return savePulssiAmounts(
    pulssiClient,
    initializeEntityBuckets(pulssiClient, searchResultsByEntity)
  );
};

export const main: Handler = async (event, context, callback) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to use pool

  const pulssiClient = await pulssiDbPool.connect();

  try {
    await saveAmountsFromElasticToDb(elasticClient, pulssiClient);
    await invokeViewerLambda();
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};
