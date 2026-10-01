import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import ArrowRightOutlined from "@mui/icons-material/ArrowRightOutlined";
import Close from "@mui/icons-material/Close";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import Language from "@mui/icons-material/Language";
import ListAltOutlined from "@mui/icons-material/ListAltOutlined";
import Menu from "@mui/icons-material/Menu";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";

/**
 * MUI v5 ei julkaise `exports`-karttaa, joten `@mui/icons-material/<Nimi>`
 * resolvoituu CJS-tiedostoon. Node ei huomioi `__esModule`-lippua, joten Viten
 * dev-SSR:ssä (jossa riippuvuus jää ulkoiseksi) default-import antaa moduuliolion
 * eikä komponenttia — React kaatuu virheeseen "Element type is invalid ... but got:
 * object". Bundlattuna (Rollup, esbuild) sama import antaa komponentin suoraan.
 *
 * Tämä purkaa molemmat tapaukset. Kaikki ikoni-importit kulkevat tämän moduulin
 * kautta, jotta kiertotie poistuu yhdestä paikasta kun MUI nostetaan versioon 6+.
 */
const interopDefault = <T>(mod: T): T => (mod as { default?: T }).default ?? mod;

export const AccessTimeIcon = interopDefault(AccessTimeOutlined);
export const ArrowRightIcon = interopDefault(ArrowRightOutlined);
export const CloseIcon = interopDefault(Close);
export const FlagIcon = interopDefault(FlagOutlined);
export const LanguageIcon = interopDefault(Language);
export const ListAltIcon = interopDefault(ListAltOutlined);
export const MenuIcon = interopDefault(Menu);
export const SchoolIcon = interopDefault(SchoolOutlined);
