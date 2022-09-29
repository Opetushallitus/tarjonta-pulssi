// Käytetään lambda-ympäristön aws-sdk:a. Ei toimi ESM-importilla, joten täytyy käyttää requirea
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SSM = require("aws-sdk/clients/ssm");

const ssm = new SSM();

export async function getSSMParam(param?: string) {
  if (param == null) {
    return undefined;
  }
  try {
    const result = await ssm
      .getParameter({
        Name: param,
        WithDecryption: true,
      })
      .promise();
    return result.Parameter?.Value;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export const DEFAULT_DB_POOL_PARAMS = {
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
  port: 5432,
};

export const entityTypes = [
  "koulutus",
  "toteutus",
  "hakukohde",
  "haku",
] as const;

export type EntityType = typeof entityTypes[number];

export type Julkaisutila = "julkaistu" | "arkistoitu";

export const getTilaBuckets = (
  dbSelectRes: any,
  elasticRes: any,
  subAggColumn: "hakutapa" | "tyyppi_path",
  subAggName: "by_koulutustyyppi_path" | "by_hakutapa"
) => {
  const rows = dbSelectRes?.rows ?? [];
  const tilaBuckets = elasticRes?.aggregations?.by_tila?.buckets ?? [];

  // Asetetaan nollaksi aggregaatioiden luvut, jotka löytyy kannasta, mutta ei elasticista.
  // Bucketteja voi kadota, jos entiteettejä muokataan. Tarvitsee nollata, jotta kantaan ei jää haamu-lukuja sotkemaan.
  rows.forEach((row: any) => {
    let tilaBucket = tilaBuckets?.find(
      (v: { key: string }) => v.key === row.tila
    );
    // Luodaan uusi tila-bucket, jos sitä ei ole
    if (!tilaBucket) {
      tilaBucket = {
        key: row.tila,
        doc_count: 0,
        aggregations: {
          [subAggName]: {
            buckets: [] 
          }
        }
      };
      tilaBuckets.push(tilaBucket);
    }

    const subBuckets = tilaBucket?.aggregations?.[subAggName]?.buckets;

    const subBucket = subBuckets?.find(
      (v: { key: string }) => v.key === row?.[subAggColumn]
    );
    if (Array.isArray(subBuckets) && subBucket == null) {
      subBuckets.push({
        key: row[subAggColumn],
        doc_count: 0,
      });
    }
  });

  return tilaBuckets;
};
