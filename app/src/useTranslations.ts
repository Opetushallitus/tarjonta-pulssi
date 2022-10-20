import { useCallback } from "react";
import { useQuery } from "react-query";
import { useLanguageState } from "./useLanguageState";

export const useTranslations = () => {
  const {lang: userLanguage} = useLanguageState();

  const { data } = useQuery<Record<string, any>>(
    "getTranslations",
    () =>
      fetch("translations.json").then((response) =>
        response.json()
      ),
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      cacheTime: Infinity,
      staleTime: Infinity,
    }
  );

  const t = useCallback(
    (k: string) => {
      let translation = data?.[k]?.[userLanguage as string];
      if (!translation) {
        console.warn(
          `Translation for key "${k}" and language "${userLanguage}" not found! Using finnish!`
        );
        translation = data?.[k]?.fi;
      }
      return translation ?? null;
    },
    [data, userLanguage]
  );

  return { t };
};
