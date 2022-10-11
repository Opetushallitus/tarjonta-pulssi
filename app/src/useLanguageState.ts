import { useSearchParam } from "react-use";
//import Cookies from 'js-cookie';

export const useLanguageState = () => {
  const lang = useSearchParam("lang") ?? "fi";
  console.log({ lang });
  const setLanguage = (newLang: string) => {
    /*Cookies.set('lang', newLang, {
            expires: 1800,
            path: '/',
          });*/
    document.documentElement.setAttribute("lang", newLang ?? "fi");
    if (newLang && newLang !== lang) {
      history.pushState("", "", `?lang=${newLang}`);
    }
  };
  return [lang, setLanguage];
};
