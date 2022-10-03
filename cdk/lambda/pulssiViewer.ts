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

export const main: Handler = async (event, context /*, callback*/) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const pulssiData = {
    koulutukset: await getCounts("koulutus"),
    toteutukset: await getCounts("toteutus"),
    hakukohteet: await getCounts("hakukohde"),
    haut: await getCounts("haku"),
  };

  await putPulssiS3Object({ Key: "pulssi.json", Body: pulssiData, ContentType: "application/json; charset=utf-8" });
};
