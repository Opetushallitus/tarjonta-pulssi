import type { PutObjectRequest } from "aws-sdk/clients/s3";
import { QueryResult } from "pg";
import render from "preact-render-to-string";
import { h } from "preact";
import App from "./app";

// Käytetään lambda-ympäristön aws-sdk:a. Ei toimi ESM-importilla, joten täytyy käyttää requirea
/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require("aws-sdk");

const s3 = new AWS.S3();
const ssm = new AWS.SSM();

export async function putPulssiS3Object(
  params: Omit<PutObjectRequest, "Bucket">
) {
  await s3.putObject({
    ...params,
    Bucket: `tarjonta-pulssi.${process.env.PUBLICHOSTEDZONE}`,
  }).promise();
}

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
            buckets: [],
          },
        },
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

const sumBy = (arr: Array<any>, getNum: (x: any) => number) => {
  return arr.reduce((result, value) => result + getNum(value), 0);
};

type DbRowBase = { tila: Julkaisutila; julkaistu_amount: number | string, arkistoitu_amount: number | string };

const template = `<!DOCTYPE html>
<html>
<head>
    <title>Tarjonta-pulssi</title>
</head>
<body>
    {{body}}
</body>
<script>
    let UPDATE_INTERVAL = 60 * 1000;
    let timeoutId = null;
    function loadContent(delay = UPDATE_INTERVAL) {
        timeoutId = setTimeout(
            () =>
                fetch(window.location.href)
                    .then(response => response.text())
                    .then(text => {
                        document.body.innerHTML = text
                        loadContent();
                    })
                    .catch((err) => {
                        console.log(err)
                    }),
            delay
        )
    }
    function onVisibilityChange() {
        if (document.hidden) {
            clearTimeout(timeoutId)
            timeoutId = null;
        } else if (!timeoutId) {
            loadContent(0)
        }
    }
    window.onload = () => {
        window.addEventListener('visibilitychange', onVisibilityChange)
        loadContent()
    }
</script>
<style>
  table {  
    border-collapse: collapse;
  }
  th, td {
    padding: 6px;
  }
  th:first-child {
    border-right: 1px solid black; 
  }
  th:not(:first-child), tr:first-child > th {
    border-bottom: 1px solid black; 
  }
</style>
</html>`;

export const getPulssiEntityData = (
  res: QueryResult<any>,
  entity: EntityType
) => {
  const rows = res.rows;

  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";
  const dataKeyName = entity === "haku" ? "by_hakutapa" : "by_tyyppi";

  const countsBySubKey = rows.reduce(
    (result, row) => {
      const primaryColValue = row?.[primaryColName];

      const julkaistu_amount = Number(row.julkaistu_amount);
      const arkistoitu_amount = Number(row.arkistoitu_amount);

      if (entity === "haku") {
        result[primaryColValue] = {
          julkaistu_amount,
          arkistoitu_amount,
        };
      } else {
        const ktParts = primaryColValue.split("/");
        let previousPartObj: Record<string, any> | null = null;
        ktParts.forEach((part: string) => {
          const target = previousPartObj ?? result;

          if (!target[part]) {
            target[part] = {
              julkaistu_amount: 0,
              arkistoitu_amount: 0,
            };
          }
          target[part].julkaistu_amount += julkaistu_amount;
          target[part].arkistoitu_amount += arkistoitu_amount;

          previousPartObj = target[part];
        });
      }
      return result;
    },
    {}
  );

  return {
    by_tila: {
      julkaistu: {
        _amount: sumBy(rows, (row: DbRowBase) => Number(row.julkaistu_amount)
        ),
      },
      arkistoitu: {
        _amount: sumBy(rows, (row: DbRowBase) => Number(row.arkistoitu_amount)
        ),
      },
    },
    [dataKeyName]: countsBySubKey,
  };
};

export type KeyValueDataWithAmount = {
  [key in string]?: KeyValueDataWithAmount;
} & {
  julkaistu_amount: number;
  arkistoitu_amount: number;
};

export type EntitySubKey = "by_tyyppi" | "by_hakutapa";

export type EntityDataWithSubKey<K extends EntitySubKey = EntitySubKey> = {
  _amount: number;
  by_tila: {
    [key in Julkaisutila]?: {
      _amount: number;
    };
  };
} & {
  [k in K]: KeyValueDataWithAmount;
};

export type PulssiData = {
  koulutukset: EntityDataWithSubKey<"by_tyyppi">;
  toteutukset: EntityDataWithSubKey<"by_tyyppi">;
  hakukohteet: EntityDataWithSubKey<"by_tyyppi">;
  haut: EntityDataWithSubKey<"by_hakutapa">;
};

export const createPulssiHTML = (pulssiData: PulssiData) => {
  return template.replace(
    "{{body}}",
    render(h(App, { data: pulssiData }), {}, { pretty: true })
  );
};
