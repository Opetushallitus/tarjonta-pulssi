import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTimeOutlined";
import FlagIcon from "@mui/icons-material/FlagOutlined";
import ListAltIcon from "@mui/icons-material/ListAltOutlined";

export const ICONS = {
  koulutus: SchoolIcon,
  toteutus: FlagIcon,
  haku: AccessTimeIcon,
  hakukohde: ListAltIcon
} as const;

export const JSON_PATH =
  process.env.NODE_ENV === "development" ? "/test_data/" : "/";

export const OPINTOPOLKU_URL = "https://opintopolku.fi";
