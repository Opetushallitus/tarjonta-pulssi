import {ReactComponent as SchoolIcon} from '@material-design-icons/svg/outlined/school.svg';
import {ReactComponent as FlagIcon} from '@material-design-icons/svg/outlined/flag.svg';
import {ReactComponent as AccessTimeIcon} from '@material-design-icons/svg/outlined/access_time.svg';
import {ReactComponent as ListAltIcon} from '@material-design-icons/svg/outlined/list_alt.svg';

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

export const JSON_PATH = process.env.NODE_ENV === "development" ? '/test_data/' : '/'