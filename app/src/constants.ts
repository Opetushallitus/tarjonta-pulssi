import { ReactComponent as SchoolIcon } from "@material-design-icons/svg/outlined/school.svg";
import { ReactComponent as FlagIcon } from "@material-design-icons/svg/outlined/flag.svg";
import { ReactComponent as AccessTimeIcon } from "@material-design-icons/svg/outlined/access_time.svg";
import { ReactComponent as ListAltIcon } from "@material-design-icons/svg/outlined/list_alt.svg";

export const ENTITY_TYPES = [
  "koulutus",
  "toteutus",
  "hakukohde",
  "haku",
] as const;

export const ICONS = {
  koulutus: SchoolIcon,
  toteutus: FlagIcon,
  haku: AccessTimeIcon,
  hakukohde: ListAltIcon,
} as const;

export const JSON_PATH =
  process.env.NODE_ENV === "development" ? "/test_data/" : "/";

export const colors = {
  brandGreen: "#3A7A10", // Header, CTA, Links
  darkGreen: "#254905", // Hover states
  lightGreen: "#9CFF5A", // Focus states
  lightGreenBg: "#CCFFCC", // Label BG
  black: "#1D1D1D", // Headings, paragraphs
  darkGrey: "#4C4C4C", // input field text
  lightGrey: "#B2B2B2", // Disabled states
  greyBg: "#F5F7F9", // Desktop BG
  white: "#FFFFFF", // Content area bg, text on dark bg
  red: "#CC3300", // Error states
};

export const SUPPORTED_LANGUAGES = ["fi", "sv", "en"] as const;

export const OPINTOPOLKU_URL = "https://opintopolku.fi";
