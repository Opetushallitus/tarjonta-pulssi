import { mapValues } from "lodash";

import i18n from "~/i18n";

import translations from "../public/locales/translation.json";

type LngItem = Record<string, string>;
export const getTranslationsForLanguage = (lng: string) => {
  const trnsForLng = mapValues(translations, (item: LngItem) => item[lng]);
  return { [i18n.defaultNS]: trnsForLng };
};
