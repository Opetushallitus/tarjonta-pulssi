import { PoolClient } from "pg";

import { ENTITY_TYPES } from "./constants";
import { savePulssiAmounts } from "./dbUtils";
import {
  getAmountsFromElastic,
  IElasticSearchClient,
  initializeSubBuckets,
  PulssiSearchResponseItem,
  SearchApiResponse,
  SearchResultsByEntity,
} from "./elasticUtils";

const initializeEntityBuckets = async (
  pulssiClient: PoolClient,
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
      const subAggName = entity === "haku" ? "by_hakutapa" : "by_koulutustyyppi_path";
      const subAggColumn = entity === "haku" ? "hakutapa" : "tyyppi_path";
      const dbGroupByResRows =
        (await pulssiClient.query(`select tila, ${subAggColumn} from ${entity}_amounts`))?.rows ??
        [];

      searchResultsByEntity[entity] = initializeSubBuckets(
        dbGroupByResRows,
        elasticResItem as PulssiSearchResponseItem,
        subAggName
      );
    }
  }
  return searchResultsByEntity;
};

export const saveAmountsFromElasticToDb = async (
  elasticClient: IElasticSearchClient,
  pulssiClient: PoolClient
) => {
  const searchApiResponse = await getAmountsFromElastic(elasticClient);
  const searchResultsByEntity = await initializeEntityBuckets(pulssiClient, searchApiResponse);
  await savePulssiAmounts(pulssiClient, searchResultsByEntity);
};
