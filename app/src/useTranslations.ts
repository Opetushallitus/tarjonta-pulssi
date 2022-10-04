import { useCallback } from "react";
import { useQuery } from "react-query"
import { JSON_PATH } from "./constants";

export const useTranslations = () => {

    const userLanguage = 'fi';

    const {data} = useQuery<Record<string, any>>("getTranslations", () => fetch(JSON_PATH + "translations.json").then(response => response.json()), {
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        cacheTime: Infinity,
        staleTime: Infinity,
    })

    const t = useCallback((k: string) => {
        const translation = data?.[k]?.[userLanguage]
        if (!translation) {
            console.warn(`Translation for key "${k}" and language "${userLanguage}" not found!`)
        }
        return translation;
    }, [data])

    return {t};
}