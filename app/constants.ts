import AccessTimeIcon from "@mui/icons-material/esm/AccessTimeOutlined";
import FlagIcon from "@mui/icons-material/esm/FlagOutlined";
import ListAltIcon from "@mui/icons-material/esm/ListAltOutlined";
import SchoolIcon from "@mui/icons-material/esm/SchoolOutlined";

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
