import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const PUBLICHOSTEDZONE = 'testiopintopolku.fi';

const koodistoURI = (koodistoNimi) =>
  `https://virkailija.${PUBLICHOSTEDZONE}/koodisto-service/rest/json/${koodistoNimi}/koodi?onlyValidKoodis=true`;

const getKoodistoTranslations = async (koodistoNimi) => {
  const res = await fetch(koodistoURI(koodistoNimi));
  const json = await res.json();
  return json?.reduce((result, hakutapa) => {
    result[hakutapa?.koodiUri] = Object.fromEntries(
      hakutapa.metadata?.map((tr) => [tr.kieli.toLowerCase(), tr.nimi])
    );
    return result;
  }, {});
};


const translationJsonPath = path.resolve('./public/translations.json');
const existingTranslations = JSON.parse(fs.readFileSync(translationJsonPath));

const newTranslations = {
...existingTranslations,
...(await getKoodistoTranslations("hakutapa")),
}
  
fs.writeFileSync(translationJsonPath, JSON.stringify(newTranslations, null, 2));