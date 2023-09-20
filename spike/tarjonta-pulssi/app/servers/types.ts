export type WithAmounts = {
  julkaistu_amount?: number;
  julkaistu_amount_old?: number;
  arkistoitu_amount?: number;
  arkistoitu_amount_old?: number;
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
