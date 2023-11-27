import { mapValues } from "lodash";

import translations from "~/app/assets/translation.json";
import i18n from "~/app/i18n";

type LngItem = Record<string, string>;
export const getTranslationsForLanguage = (lng: string) => {
  const trnsForLng = mapValues(translations, (item: LngItem) => item[lng]);
  return { [i18n.defaultNS]: trnsForLng };
};
