import { RemixI18Next } from "remix-i18next";

import i18n from "~/app/i18n"; // your i18n configuration file

import { getTranslationsForLanguage } from "./translations";

const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: i18n.supportedLngs,
    fallbackLanguage: i18n.fallbackLng,
  },
  // This is the configuration for i18next used
  // when translating messages server-side only
  i18next: {
    ...i18n,
    resources: {
      fi: getTranslationsForLanguage("fi"),
      sv: getTranslationsForLanguage("sv"),
      en: getTranslationsForLanguage("en"),
    },
    //debug: true,
  },
});

export default i18next;
