import { createPulssiHTML } from "../lambda/shared";
import fs from "fs";

const pulssiData = {
  koulutukset: {
    _amount: 2465,
    by_tila: {
      julkaistu: {
        _amount: 2275,
      },
      arkistoitu: {
        _amount: 190,
      },
    },
    by_tyyppi: {
      yo: {
        julkaistu_amount: 1209,
        arkistoitu_amount: 90,
      },
      amk: {
        julkaistu_amount: 531,
        arkistoitu_amount: 63,
      },
      "vapaa-sivistystyo": {
        julkaistu_amount: 234,
        arkistoitu_amount: 5,
        "vapaa-sivistystyo-muu": {
          julkaistu_amount: 234,
          arkistoitu_amount: 5,
        }
      },
      amm: {
        julkaistu_amount: 146,
        arkistoitu_amount: 14,
      },
      "amm-tutkinnon-osa": {
        julkaistu_amount: 112,
        arkistoitu_amount: 9,
      },
      "amm-osaamisala": {
        julkaistu_amount: 21,
        arkistoitu_amount: 6,
      },
      lk: {
        julkaistu_amount: 10,
        arkistoitu_amount: 3,
      },
      "amm-muu": {
        julkaistu_amount: 6,
        arkistoitu_amount: 0,
      },
      "kk-muu": {
        julkaistu_amount: 3,
        arkistoitu_amount: 0
      },
      "aikuisten-perusopetus": {
        julkaistu_amount: 1,
        arkistoitu_amount: 0,
      },
      telma: {
        julkaistu_amount: 1,
        arkistoitu_amount: 0,
      },
      tuva: {
        julkaistu_amount: 1,
        arkistoitu_amount: 0,
      },
    },
  },
};

test.skip("createPulssiHTML", async () => {
  fs.writeFileSync("pulssi.html", createPulssiHTML(pulssiData as any));
});
