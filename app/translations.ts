import mapValues from "lodash/mapValues";

import translations from "~/app/assets/translation.json";
import i18n from "~/app/i18n";
import { SUPPORTED_LANGUAGES } from "~/shared/constants";

type LngItem = Record<string, string>;
export const getTranslationsForLanguage = (lng: string) => {
  const trnsForLng = mapValues(translations, (item: LngItem) => item[lng]);
  return { [i18n.defaultNS]: trnsForLng };
};

/**
 * Kaikkien tuettujen kielten käännökset i18next:n `resources`-muodossa. Käännökset
 * bundlataan sovellukseen, joten erillistä i18next-backendiä ei tarvita kummallakaan
 * puolella.
 */
export const translationResources = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lng) => [lng, getTranslationsForLanguage(lng)])
);
