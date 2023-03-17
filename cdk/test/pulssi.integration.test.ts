import jetpack from "fs-jetpack";

const data = jetpack.read('test/resources/pulssi.json');
const pulssiJson = JSON.parse(data || "");
const koulutukset = pulssiJson.koulutukset;
const toteutukset = pulssiJson.toteutukset;
const hakukohteet = pulssiJson.hakukohteet;
const haut = pulssiJson.haut;

const expectAmounts = (entityObject: any) => {
  expect(entityObject.julkaistu_amount).toBeGreaterThan(0);
  expect(entityObject.arkistoitu_amount).toBeGreaterThan(0);
};

const expectEntityAmounts = (entity: any) => {
  expectAmounts(entity.by_tila);

  expectAmounts(entity.by_tyyppi.kk);
  expectAmounts(entity.by_tyyppi.kk.yo);
  expectAmounts(entity.by_tyyppi.kk.amk);

  expectAmounts(entity.by_tyyppi["kk-muu"]);
  expectAmounts(entity.by_tyyppi["kk-muu"]["ope-pedag-opinnot"]);
  expectAmounts(entity.by_tyyppi["kk-muu"]["kk-opintojakso"]);
  expectAmounts(entity.by_tyyppi["kk-muu"]["kk-opintojakso-avoin"]);
  expectAmounts(entity.by_tyyppi["kk-muu"]["kk-opintokokonaisuus"]);
  expectAmounts(entity.by_tyyppi["kk-muu"]["kk-opintokokonaisuus-avoin"]);
  expectAmounts(entity.by_tyyppi["kk-muu"].erikoistumiskoulutus); 
  expectAmounts(entity.by_tyyppi["kk-muu"].erikoislaakari); 

  expectAmounts(entity.by_tyyppi.amm);
  expectAmounts(entity.by_tyyppi.amm["muu-amm-tutkintoon-johtava"]);

  expectAmounts(entity.by_tyyppi["amm-tutkintoon-johtamaton"]);
  expectAmounts(entity.by_tyyppi["amm-tutkintoon-johtamaton"]["amm-tutkinnon-osa"]);
  expectAmounts(entity.by_tyyppi["amm-tutkintoon-johtamaton"]["amm-osaamisala"]);
  expectAmounts(entity.by_tyyppi["amm-tutkintoon-johtamaton"]["amm-muu"]);
  expectAmounts(entity.by_tyyppi["amm-tutkintoon-johtamaton"].telma);

  expectAmounts(entity.by_tyyppi.tuva);
  expectAmounts(entity.by_tyyppi.lk);
  expectAmounts(entity.by_tyyppi["vapaa-sivistystyo"]);
  expectAmounts(entity.by_tyyppi["amm-ope-erityisope-ja-opo"]);
  expectAmounts(entity.by_tyyppi["aikuisten-perusopetus"]);
  expectAmounts(entity.by_tyyppi["taiteen-perusopetus"]);
};

test("Numbers of all data types should be present and > 0. Furthermore, there should be both published and archieved for all datatypes", () => {
  expectEntityAmounts(koulutukset);

  expectEntityAmounts(toteutukset);
  expect(toteutukset.by_tila.julkaistu_jotpa_amount).toBeGreaterThan(0);
  expect(toteutukset.by_tila.arkistoitu_jotpa_amount).toBeGreaterThan(0);
  expect(toteutukset.by_tila.julkaistu_taydennyskoulutus_amount).toBeGreaterThan(0);
  expect(toteutukset.by_tila.arkistoitu_taydennyskoulutus_amount).toBeGreaterThan(0);
  expect(toteutukset.by_tila.julkaistu_tyovoimakoulutus_amount).toBeGreaterThan(0);
  expect(toteutukset.by_tila.arkistoitu_tyovoimakoulutus_amount).toBeGreaterThan(0);

  expectEntityAmounts(hakukohteet);

  expectAmounts(haut.by_tila);
  expectAmounts(haut.by_hakutapa.hakutapa_01);
  expectAmounts(haut.by_hakutapa.hakutapa_02);
  expectAmounts(haut.by_hakutapa.hakutapa_03);
  expectAmounts(haut.by_hakutapa.hakutapa_04);
  expectAmounts(haut.by_hakutapa.hakutapa_05);
  expectAmounts(haut.by_hakutapa.hakutapa_06);
});