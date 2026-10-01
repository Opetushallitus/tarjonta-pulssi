import { AccessTimeIcon, FlagIcon, ListAltIcon, SchoolIcon } from "~/app/icons";

export const LANGUAGES_BY_CODE = {
  fi: "Suomeksi",
  sv: "På svenska",
  en: "In English",
};

export const ICONS = {
  koulutus: SchoolIcon,
  toteutus: FlagIcon,
  haku: AccessTimeIcon,
  hakukohde: ListAltIcon,
} as const;
