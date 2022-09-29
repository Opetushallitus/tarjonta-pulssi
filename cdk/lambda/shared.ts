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

