import type { ENTITY_TYPES, SUPPORTED_LANGUAGES } from "./constants";

export type EntityType = typeof ENTITY_TYPES[number];

export type Julkaisutila = "julkaistu" | "arkistoitu";
export type EntitySubKey = "by_tyyppi" | "by_hakutapa";
export type EntityPlural = "koulutukset" | "toteutukset" | "hakukohteet" | "haut"

type RowBase = {
  tila: Julkaisutila;
  amount: number;
};

export type HakuRow = {
  hakutapa: string;
} & RowBase;

export type RowWithKoulutustyyppiPath = {
  tyyppi_path: string;
} & RowBase;

export type ToteutusRow = RowWithKoulutustyyppiPath & {
  jotpa_amount: number;
  taydennyskoulutus_amount: number;
  tyovoimakoulutus_amount: number;
};

export type Row = HakuRow | RowWithKoulutustyyppiPath;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number];

export type WithAmounts = {
  julkaistu_amount?: number;
  julkaistu_amount_old?: number;
  arkistoitu_amount?: number;
  arkistoitu_amount_old?: number;
};

export type SubKeyWithAmounts = {
  subkey: string;
  items?: Array<SubKeyWithAmounts>;
} & WithAmounts;

export type EntityDataWithSubKey = {
  by_tila: WithAmounts & {
    julkaistu_jotpa_amount?: number;
    julkaistu_jotpa_amount_old?: number;
    arkistoitu_jotpa_amount?: number;
    arkistoitu_jotpa_amount_old?: number;
    julkaistu_taydennyskoulutus_amount?: number;
    julkaistu_taydennyskoulutus_amount_old?: number;
    arkistoitu_taydennyskoulutus_amount?: number;
    arkistoitu_taydennyskoulutus_amount_old?: number;
    julkaistu_tyovoimakoulutus_amount?: number;
    julkaistu_tyovoimakoulutus_amount_old?: number;
    arkistoitu_tyovoimakoulutus_amount?: number;
    arkistoitu_tyovoimakoulutus_amount_old?: number;
  },
  items: Array<SubKeyWithAmounts>;
}

export type PulssiData = {
  koulutukset: EntityDataWithSubKey;
  toteutukset: EntityDataWithSubKey;
  hakukohteet: EntityDataWithSubKey;
  haut: EntityDataWithSubKey;
}

export type SubEntitiesByEntities = {
  koulutukset: Array<string>,
  toteutukset: Array<string>,
  hakukohteet: Array<string>,
  haut: Array<string>
}

export type SubEntityAmounts = {
  julkaistu: Array<string>,
  arkistoitu: Array<string>,
};

export type SubEntitiesByEntitiesByTila = {
  koulutukset: SubEntityAmounts,
  toteutukset: SubEntityAmounts,
  hakukohteet: SubEntityAmounts,
  haut: SubEntityAmounts
}

export type DatabaseRow = {
  sub_entity: string,
  tila: Julkaisutila,
  start_timestamp: string,
  amount: number,
  jotpa_amount?: number,
  taydennyskoulutus_amount?: number,
  tyovoimakoulutus_amount?: number,
}
