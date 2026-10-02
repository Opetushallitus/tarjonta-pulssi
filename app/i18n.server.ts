import { createInstance, type i18n as I18n } from "i18next";

import { SUPPORTED_LANGUAGES } from "~/shared/constants";

import i18nConfig from "./i18n";
import { translationResources } from "./translations";

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const isSupported = (lng: string | null | undefined): lng is SupportedLanguage =>
  SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage);

/**
 * Accept-Language -otsake laatuarvon mukaan laskevassa järjestyksessä. Aluetarkenne
 * pudotetaan ("en-US" -> "en"), koska tuetut kielet ovat pelkkiä kielikoodeja.
 */
const parseAcceptLanguage = (header: string | null) =>
  (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params.find((param) => param.trim().startsWith("q="));
      return {
        tag: tag.split("-")[0].toLowerCase(),
        quality: quality ? Number(quality.trim().slice(2)) : 1,
      };
    })
    .filter(({ tag, quality }) => tag !== "" && !Number.isNaN(quality))
    .sort((a, b) => b.quality - a.quality)
    .map(({ tag }) => tag);

/**
 * Lokaalin tunnistus pyynnöstä: `?lng=` voittaa, muuten selaimen Accept-Language,
 * muuten fallback. Vastaa aiemman remix-i18next-kokoonpanon käyttäytymistä — evästettä
 * tai sessiota ei ole koskaan ollut käytössä.
 */
export const getLocale = (request: Request): string => {
  const fromQuery = new URL(request.url).searchParams.get("lng");
  if (isSupported(fromQuery)) {
    return fromQuery;
  }
  return (
    parseAcceptLanguage(request.headers.get("accept-language")).find(isSupported) ??
    i18nConfig.fallbackLng
  );
};

// Loaderien käyttämät instanssit voi jakaa pyyntöjen kesken, koska kullakin on kiinteä
// kieli eikä niitä käytetä Reactin renderöinnissä. Renderöinnin instanssi luodaan
// erikseen pyyntökohtaisesti entry.server.tsx:ssä.
const instancesByLocale = new Map<string, Promise<I18n>>();

const getI18nInstance = (locale: string) => {
  const existing = instancesByLocale.get(locale);
  if (existing) {
    return existing;
  }
  const instance = createInstance();
  const initialized = instance
    .init({
      ...i18nConfig,
      lng: locale,
      ns: [i18nConfig.defaultNS],
      resources: translationResources,
    })
    .then(() => instance);
  instancesByLocale.set(locale, initialized);
  return initialized;
};

/** Palvelinpuolen `t`-funktio annetulle kielelle. */
export const getFixedT = async (locale: string) => {
  const instance = await getI18nInstance(locale);
  return instance.getFixedT(locale);
};
