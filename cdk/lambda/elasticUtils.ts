import {
  ApiResponse,
  Client as ElasticSearchClient,
} from "@elastic/elasticsearch";
import type { Client as IElasticSearchClient } from "@elastic/elasticsearch/api/new";

import {
  AggregationsBuckets,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  MsearchMultiSearchItem,
  MsearchResponse,
} from "@elastic/elasticsearch/api/types";
import { ENTITY_TYPES } from "../shared/constants";
import { EntityType, Row } from "../shared/types";
import { getSSMParam } from "./awsUtils";

export const connectElastic = async () => {
  const elasticUrlWithCredentials = await getSSMParam(
    process.env.KOUTA_ELASTIC_URL_WITH_CREDENTIALS
  );

  // @ts-expect-error @elastic/elasticsearch
  const client: IElasticSearchClient = new ElasticSearchClient({
    node: elasticUrlWithCredentials,
  });
  return client;
};

export type { Client as IElasticSearchClient } from "@elastic/elasticsearch/api/new";

export type SearchResultsByEntity = Record<
  EntityType,
  PulssiSearchResponseItem | null
>;

export type PulssiAggregations = {
  by_tila: AggregationsStringTermsAggregate;
};

export type PulssiSearchResponseItem =
  MsearchMultiSearchItem<EntityDocument> & {
    aggregations: PulssiAggregations;
  };

export type SearchApiResponse = ApiResponse<
  MsearchResponse<EntityDocument>,
  PulssiAggregations
>;

export type EntityDocument = {
  koulutustyyppiPath?: string;
  hakutapa?: string;
};

const DEFAULT_AGGS = {
  by_koulutustyyppi_path: {
    terms: {
      field: "koulutustyyppiPath.keyword",
      size: 100,
    },
  },
};

const AGGS_BY_ENTITY: Record<EntityType, object> = {
  koulutus: DEFAULT_AGGS,
  toteutus: {
    by_koulutustyyppi_path: {
      terms: {
        field: "koulutustyyppiPath.keyword",
        size: 100,
      },
      aggs: {
        has_jotpa: {
          filter: {
            term: {
              "metadata.hasJotpaRahoitus": true,
            },
          },
        },
      },
    },
  },
  hakukohde: DEFAULT_AGGS,
  haku: {
    by_hakutapa: {
      terms: {
        field: "hakutapa.koodiUri.keyword",
        size: 100,
      },
    },
  },
} as const;

export const bucketsAsArr = <T = unknown>(buckets?: AggregationsBuckets<T>) =>
  buckets ? (buckets as Array<T>) : [];

export const getSubBuckets = (
  bucket: AggregationsStringTermsBucket,
  subAggName: string
) =>
  bucketsAsArr(
    (bucket?.[subAggName] as AggregationsStringTermsAggregate | undefined)
      ?.buckets
  );

export const getAmountsFromElastic = async (
  elasticClient: IElasticSearchClient
) => {
  return elasticClient.msearch<EntityDocument, PulssiAggregations>({
    body: ENTITY_TYPES.flatMap((entity) => [
      { index: `${entity}-kouta` },
      {
        size: 0, // Ei haluta hakutuloksia, vain aggsit
        query: {
          terms: {
            tila: ["julkaistu", "arkistoitu"],
          },
        },
        aggs: {
          by_tila: {
            terms: {
              field: "tila.keyword",
              size: 10,
            },
            aggs: AGGS_BY_ENTITY[entity],
          },
        },
      },
    ]),
  });
};

const resetSubBucket = (
  subBuckets: AggregationsBuckets<AggregationsStringTermsBucket> | undefined,
  subAggKey: string
) => {
  const subBucket = bucketsAsArr(subBuckets)?.find(
    (v: { key: string }) => v.key === subAggKey
  );
  if (Array.isArray(subBuckets) && subBucket == null) {
    subBuckets.push({
      key: subAggKey,
      doc_count: 0,
    });
  }
};

export const initializeSubBuckets = (
  rows: Array<Row>,
  elasticRes: PulssiSearchResponseItem,
  subAggName: "by_koulutustyyppi_path" | "by_hakutapa"
) => {
  const tilaBuckets = bucketsAsArr(elasticRes?.aggregations?.by_tila?.buckets);

  // Asetetaan nollaksi aggregaatioiden luvut, jotka löytyy kannasta, mutta ei elasticista.
  // Bucketteja voi kadota, jos entiteettejä muokataan. Tarvitsee nollata, jotta kantaan ei jää haamu-lukuja sotkemaan.
  rows.forEach((row) => {
    let tilaBucket = tilaBuckets?.find(
      (v: { key: string }) => v.key === row.tila
    );
    // Luodaan uusi tila-bucket, jos sitä ei ole
    if (!tilaBucket) {
      tilaBucket = {
        key: row.tila,
        doc_count: 0,
        [subAggName]: {
          buckets: [],
        },
      };
      tilaBuckets.push(tilaBucket);
    }

    const subBuckets = getSubBuckets(tilaBucket, subAggName);

    if ("hakutapa" in row) {
      resetSubBucket(subBuckets, row.hakutapa);
    } else {
      resetSubBucket(subBuckets, row.tyyppi_path);
    }
  });

  if (elasticRes?.aggregations?.by_tila?.buckets) {
    elasticRes.aggregations.by_tila.buckets = tilaBuckets;
  }

  return elasticRes;
};
