import { useTranslation as reactUseTranslation } from "react-i18next";

export const useTranslation = () => {
  const { t : reactT, i18n } = reactUseTranslation();

  return {t: (key: string) => reactT(`${key}.${i18n.language}`), i18n};
};
