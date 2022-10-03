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

    return data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v?.[userLanguage]])) : {};
}