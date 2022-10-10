import {
  AppBar,
  Chip,
  Link,
  Typography,
  styled,
} from '@mui/material';
import {makeStyles} from 'tss-react/mui'
import { visuallyHidden } from '@mui/utils';

import {ReactComponent as opintopolkuLogoEn} from './assets/opintopolku_logo_header_en.svg';
import {ReactComponent as opintopolkuLogoSv} from './assets/opintopolku_logo_header_sv.svg';
import {ReactComponent as opintopolkuLogoFi} from './assets/opintopolku_logo_header_fi.svg';
import { colors, OPINTOPOLKU_URL } from './constants';

import { LanguageDropdown } from './LanguageDropdown';
import { useTranslations } from './useTranslations';
import { useLanguageState } from './useLanguageState';
import { LanguageCode } from './commonTypes';

const useStyles = makeStyles({name: "Header"})({
  testi: {
    color: colors.white,
    borderRadius: 2,
    marginLeft: 20,
    padding: '0px 5px',
    background: colors.red
  },
  testiLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
})

const PulssiAppBar = styled(AppBar)(() => ({
  backgroundColor: 'green',
  position: 'sticky',
  height: 'auto',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '10px 20px',
  justifyContent: 'space-between'
}))

const testiLabels: Record<string, string | undefined> = {
  'localhost': 'localhost',
  'untuvaopintopolku.fi': 'untuva',
  'hahtuvaopintopolku.fi': 'hahtuva',
  'testiopintopolku.fi': 'testi',
};

const getOpintopolkuHeaderLogo = (lang?: LanguageCode) => {
  switch (lang) {
    case 'fi':
      return opintopolkuLogoFi;
    case 'en':
      return opintopolkuLogoEn;
    case 'sv':
      return opintopolkuLogoSv;
    default:
      return opintopolkuLogoFi;
  }
};

const Heading = styled(Typography)`
  font-size: 35px;
  font-weight: 600;
  color: white;
`

const VisuallyHidden: React.FC = ({children}) => <span style={visuallyHidden}>{children}</span>

export const Header = () => {
  const { t } = useTranslations();

  const [lang] = useLanguageState()
  const {classes} = useStyles();

  const testiLabel = testiLabels?.[window.location.hostname];

  const OpintopolkuHeaderLogoSvg = getOpintopolkuHeaderLogo(lang as any);

  return (
      <PulssiAppBar>
          <Link href={OPINTOPOLKU_URL}>
              <OpintopolkuHeaderLogoSvg focusable="false" aria-hidden="true" />
              <VisuallyHidden>{t('siirry_opintopolkuun')}</VisuallyHidden>
          </Link>
          {testiLabel && (
            <Chip
              size="small"
              classes={{ root: classes.testi, label: classes.testiLabel }}
              label={testiLabel}
            />
          )}
          <Heading>{t('sivu_otsikko')}</Heading>
          <LanguageDropdown />
      </PulssiAppBar>
  );
};
