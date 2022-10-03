import { ENTITY_TYPES } from "./constants";


  export type EntityType = typeof ENTITY_TYPES[number];
  
  export type Julkaisutila = "julkaistu" | "arkistoitu";
  
  export type WithAmounts = {
    julkaistu_amount: number;
    arkistoitu_amount: number;
  }
  
  export type KeyValueDataWithAmount = {
    [key in string]?: KeyValueDataWithAmount;
  } & WithAmounts;
  
  export type EntitySubKey = "by_tyyppi" | "by_hakutapa";
  
  export type EntityDataWithSubKey<K extends EntitySubKey = EntitySubKey> = {
    by_tila: {
      [key in Julkaisutila]?: {
        _amount: number;
      };
    };
  } & {
    [k in K]: KeyValueDataWithAmount;
  }
  
  export type PulssiData = {
    koulutukset: EntityDataWithSubKey<"by_tyyppi">;
    toteutukset: EntityDataWithSubKey<"by_tyyppi">;
    hakukohteet: EntityDataWithSubKey<"by_tyyppi">;
    haut: EntityDataWithSubKey<"by_hakutapa">;
  };
