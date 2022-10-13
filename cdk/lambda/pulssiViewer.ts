import { Handler } from "aws-lambda";
import { getPulssiData, getPulssiTranslations } from "./pulssiViewerUtils";
import { Pool } from "pg";
import { getSSMParam, putPulssiS3Object } from "./awsUtils";
import { DEFAULT_DB_POOL_PARAMS } from "./dbUtils";

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

export const main: Handler = async (event, context /*, callback*/) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const translations = await getPulssiTranslations();

  const pulssiData = await getPulssiData(pulssiDbPool);

  await putPulssiS3Object({
    Key: "pulssi.json",
    Body: JSON.stringify(pulssiData),
    ContentType: "application/json; charset=utf-8",
  });

  await putPulssiS3Object({
    Key: "translations.json",
    Body: JSON.stringify(translations),
    ContentType: "application/json; charset=utf-8",
  });
};
