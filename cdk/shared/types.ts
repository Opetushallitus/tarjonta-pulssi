import { ENTITY_TYPES, SUPPORTED_LANGUAGES } from "./constants";

export type EntityType = typeof ENTITY_TYPES[number];

export type Julkaisutila = "julkaistu" | "arkistoitu";

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
};

export type Row = HakuRow | RowWithKoulutustyyppiPath;

export type WithAmounts = {
  julkaistu_amount?: number;
  arkistoitu_amount?: number;
};

export type SubKeyWithAmounts = {
  [key in string]?: SubKeyWithAmounts;
} & WithAmounts;

export type EntitySubKey = "by_tyyppi" | "by_hakutapa";

type OneKey<K extends string, V = unknown> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

export type EntityDataWithSubKey<K extends EntitySubKey = EntitySubKey> = {
  by_tila: WithAmounts & {
    julkaistu_jotpa_amount?: number;
    arkistoitu_jotpa_amount?: number;
  };
} & OneKey<
  K,
  {
    [key in string]: SubKeyWithAmounts;
  }
>;

export type PulssiData = {
  koulutukset: EntityDataWithSubKey<"by_tyyppi">;
  toteutukset: EntityDataWithSubKey<"by_tyyppi">;
  hakukohteet: EntityDataWithSubKey<"by_tyyppi">;
  haut: EntityDataWithSubKey<"by_hakutapa">;
};

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number];