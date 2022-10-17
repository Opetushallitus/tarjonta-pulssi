import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
//import Cookies from 'js-cookie';

export const useLanguageState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = searchParams.get("lang");

  const setLang = useCallback(
    (newLang: string) => {
      /*Cookies.set('lang', newLang, {
            expires: 1800,
            path: '/',
          });*/
      document.documentElement.setAttribute("lang", newLang);
      if (newLang && newLang !== lang) {
        //window.location.replace(`?lang=${newLang}`);
        setSearchParams({ lang: newLang });
      }
    },
    [setSearchParams, lang]
  );

  return {lang, setLang};
};
