import AccessTimeIcon from "@mui/icons-material/AccessTimeOutlined";
import FlagIcon from "@mui/icons-material/FlagOutlined";
import ListAltIcon from "@mui/icons-material/ListAltOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";

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
