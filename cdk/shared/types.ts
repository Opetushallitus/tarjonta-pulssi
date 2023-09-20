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
  taydennyskoulutus_amount: number;
  tyovoimakoulutus_amount: number;
};

export type Row = HakuRow | RowWithKoulutustyyppiPath;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number];