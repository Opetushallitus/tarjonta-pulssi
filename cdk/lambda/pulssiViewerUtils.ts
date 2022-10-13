import { Pool, QueryResult } from "pg";
import { EntityType } from "../shared/types";
import { DbRowBase, queryPulssiAmounts } from "./dbUtils";

const sumBy = (arr: Array<any>, getNum: (x: any) => number) => {
  return arr.reduce((result, value) => result + getNum(value), 0);
};

export const dbQueryResultToPulssiData = (
  res: QueryResult<any>,
  entity: EntityType
) => {
  const rows = res.rows;

  const primaryColName = entity === "haku" ? "hakutapa" : "tyyppi_path";
  const dataKeyName = entity === "haku" ? "by_hakutapa" : "by_tyyppi";

  const countsBySubKey = rows.reduce((result, row) => {
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
  }, {});

  return {
    by_tila: {
      julkaistu_amount: sumBy(rows, (row: DbRowBase) =>
        Number(row.julkaistu_amount)
      ),
      arkistoitu_amount: sumBy(rows, (row: DbRowBase) =>
        Number(row.arkistoitu_amount)
      ),
      ...(entity === "toteutus"
        ? {
            julkaistu_jotpa_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row.julkaistu_jotpa_amount ?? 0)
            ),
            arkistoitu_jotpa_amount: sumBy(rows, (row: DbRowBase) =>
              Number(row?.arkistoitu_jotpa_amount ?? 0)
            ),
          }
        : {}),
    },
    [dataKeyName]: countsBySubKey,
  };
};

const getPulssiAmounts = async (pulssiDbPool: Pool, entity: EntityType) => {
  const res = await queryPulssiAmounts(pulssiDbPool, entity);
  return dbQueryResultToPulssiData(res, entity);
};

export const getPulssiData = async (pulssiDbPool: Pool) => {
  const pulssiData = {
    koulutukset: await getPulssiAmounts(pulssiDbPool, "koulutus"),
    toteutukset: await getPulssiAmounts(pulssiDbPool, "toteutus"),
    hakukohteet: await getPulssiAmounts(pulssiDbPool, "hakukohde"),
    haut: await getPulssiAmounts(pulssiDbPool, "haku"),
  };
  return pulssiData;
};

const koodistoURI = (koodistoNimi: string) =>
  `https://virkailija.${process.env.PUBLICHOSTEDZONE}/koodisto-service/rest/json/${koodistoNimi}/koodi?onlyValidKoodis=true`;
const localizationsUri = `https://virkailija.${process.env.PUBLICHOSTEDZONE}/lokalisointi/cxf/rest/v1/localisation?category=tarjonta-pulssi`;

const getKoodistoTranslations = async (koodistoNimi: string) => {
  const res = await fetch(koodistoURI(koodistoNimi));
  const json: any = await res.json();
  return json?.reduce((result: any, hakutapa: any) => {
    result[hakutapa?.koodiUri] = Object.fromEntries(
      hakutapa.metadata?.map((tr: any) => [tr.kieli.toLowerCase(), tr.nimi])
    );
    return result;
  }, {});
};

const getLocalizations = async () => {
  const res = await fetch(localizationsUri);
  const json: any = await res.json();
  const result: Record<string, any> = {};
  json?.forEach((translation: any) => {
    if (!result[translation.key]) {
      result[translation.key] = {};
    }
    result[translation.key][translation.locale] = translation.value;
  });
  return result;
};

export const getPulssiTranslations = async () => {
  return {
    ...(await getLocalizations()),
    ...(await getKoodistoTranslations("koulutustyyppi")),
    ...(await getKoodistoTranslations("hakutapa")),
  };
};
