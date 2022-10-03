import { Handler } from "aws-lambda";
import {
  DEFAULT_DB_POOL_PARAMS,
  getPulssiEntityData,
  getSSMParam,
  Julkaisutila,
  putPulssiS3Object,
} from "./shared";
import type { EntityType } from "./shared";
import { Pool } from "pg";
import fetch from "node-fetch";

const PULSSI_DB_USER = await getSSMParam(
  process.env.TARJONTAPULSSI_POSTGRES_RO_USER
);
const PULSSI_DB_PASSWORD = await getSSMParam(
  process.env.TARJONTAPULSSI_POSTGRES_RO_PASSWORD
);

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
  port: 5432,
  database: "tarjontapulssi",
  user: PULSSI_DB_USER,
  password: PULSSI_DB_PASSWORD,
});

const createTilaAmountCol = (tila: Julkaisutila) =>
  `coalesce(sum(amount) filter(where tila = '${tila}'), 0) as ${tila}_amount`;

const getCounts = async (entity: EntityType) => {
  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";

  const res = await pulssiDbPool.query(
    `select ${primaryColName}, ${createTilaAmountCol(
      "julkaistu"
    )}, ${createTilaAmountCol(
      "arkistoitu"
    )} from ${entity}_amounts group by ${primaryColName}`
  );
  return getPulssiEntityData(res, entity);
};

const koodistoURI = (koodistoNimi: string) =>
  `https://${process.env.PUBLICHOSTEDZONE}/koodisto-service/rest/json/${koodistoNimi}/koodi?onlyValidKoodis=true`;
const localizationsUri = `https://${process.env.PUBLICHOSTEDZONE}/lokalisointi/cxf/rest/v1/localisation?category=tarjonta-pulssi`;

const getKoodistoTranslations = async (koodistoNimi: string) => {
  return fetch(koodistoURI(koodistoNimi))
    .then((res) => res.json())
    .then((data: any) =>
      data?.reduce((result: any, hakutapa: any) => {
        result[hakutapa?.koodiUri] = Object.fromEntries(
          hakutapa.metadata?.map((tr: any) => [tr.kieli.toLowerCase(), tr.nimi])
        );
        return result;
      }, {})
    );
};

const getLocalizations = async () => {
  return fetch(localizationsUri)
    .then((res) => res.json())
    .then((data: any) => {
      const result: Record<string, any> = {};
      data?.forEach((translation: any) => {
        if (!result[translation.key]) {
          result[translation.key] = {};
        }
        result[translation.key][translation.locale] = translation.value;
      });
      return result;
    });
};

export const main: Handler = async (event, context /*, callback*/) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const pulssiData = {
    koulutukset: await getCounts("koulutus"),
    toteutukset: await getCounts("toteutus"),
    hakukohteet: await getCounts("hakukohde"),
    haut: await getCounts("haku"),
  };

  const translations = {
    ...(await getLocalizations()),
    ...(await getKoodistoTranslations("koulutustyyppi")),
    ...(await getKoodistoTranslations("hakutapa"))
  };

  await putPulssiS3Object({
    Key: "pulssi.json",
    Body: pulssiData,
    ContentType: "application/json; charset=utf-8",
  });

  await putPulssiS3Object({
    Key: "translations.json",
    Body: translations,
    ContentType: "application/json; charset=utf-8",
  });
};
