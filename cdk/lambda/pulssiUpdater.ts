import { Handler } from "aws-lambda";
import { PoolClient } from "pg";
import { invokeViewerLambda } from "./awsUtils";
import {
  connectElastic,
  IElasticSearchClient,
  getAmountsFromElastic,
  initializeSubBuckets,
  PulssiSearchResponseItem,
  SearchApiResponse,
  SearchResultsByEntity,
} from "./elasticUtils";
import { createPulssiDbPool, savePulssiAmounts } from "./dbUtils";
import { ENTITY_TYPES } from "../shared/constants";

const elasticClient = await connectElastic();
const pulssiDbPool = await createPulssiDbPool();

const initializeEntityBuckets = async (
  pulssiClient,
  searchApiRes: SearchApiResponse
) => {

  const searchResItems = searchApiRes?.body?.responses;

  const searchResultsByEntity: SearchResultsByEntity = {
    koulutus: null,
    toteutus: null,
    hakukohde: null,
    haku: null,
  };

  for (let index = 0; index < ENTITY_TYPES.length; ++index) {
    const entity = ENTITY_TYPES[index];
    const elasticResItem = searchResItems?.[index];
    if (!("error" in elasticResItem)) {
      const subAggName =
        entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";
      const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";
      const dbGroupByResRows =
        (
          await pulssiClient.query(
            `select tila, ${subAggColumn} from ${entity}_amounts`
          )
        )?.rows ?? [];

      searchResultsByEntity[entity] = initializeSubBuckets(
        dbGroupByResRows,
        elasticResItem as PulssiSearchResponseItem,
        subAggName
      );
    }
  }
  return searchResultsByEntity;
};

const saveAmountsFromElasticToDb = async (
  elasticClient: IElasticSearchClient,
  pulssiClient: PoolClient
) => {
  const searchApiResponse = (await getAmountsFromElastic(elasticClient));
  const searchResultsByEntity = await initializeEntityBuckets(
    pulssiClient,
    searchApiResponse
  );
  await savePulssiAmounts(pulssiClient, searchResultsByEntity);
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
