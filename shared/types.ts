import type { ENTITY_TYPES, SUPPORTED_LANGUAGES } from "./constants";

export type EntityType = (typeof ENTITY_TYPES)[number];

export type Julkaisutila = "julkaistu" | "arkistoitu";
export type EntitySubKey = "by_tyyppi" | "by_hakutapa";
export type EntityPlural = "koulutukset" | "toteutukset" | "hakukohteet" | "haut";

interface RowBase {
  tila: Julkaisutila;
  amount: number;
}

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

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export interface WithAmounts {
  julkaistu_amount?: number;
  julkaistu_amount_old?: number;
  arkistoitu_amount?: number;
  arkistoitu_amount_old?: number;
}

export type SubKeyWithAmounts = {
  subkey: string;
  items?: Array<SubKeyWithAmounts>;
} & WithAmounts;

export interface EntityDataWithSubKey {
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
  };
  items: Array<SubKeyWithAmounts>;
}

export type PulssiData = {
  [E in EntityPlural]: EntityDataWithSubKey;
} & {
  minAikaleima?: string;
};

export type SubEntitiesByEntities = {
  [E in EntityPlural]: Array<string>;
};

export interface SubEntityAmounts {
  julkaistu: Array<string>;
  arkistoitu: Array<string>;
}

export type SubEntitiesByEntitiesByTila = {
  [E in EntityPlural]: SubEntityAmounts;
};

export interface DatabaseRow {
  sub_entity: string;
  tila: Julkaisutila;
  start_timestamp: Date;
  amount?: number;
  jotpa_amount?: number;
  taydennyskoulutus_amount?: number;
  tyovoimakoulutus_amount?: number;
}
export type EntityDatabaseResults = {
  [E in EntityPlural]: Array<DatabaseRow>;
};
