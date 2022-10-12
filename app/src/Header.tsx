import { AppBar, Link, Typography, styled, useTheme, useMediaQuery } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import { ReactComponent as opintopolkuLogoEn } from "./assets/opintopolku_logo_header_en.svg";
import { ReactComponent as opintopolkuLogoSv } from "./assets/opintopolku_logo_header_sv.svg";
import { ReactComponent as opintopolkuLogoFi } from "./assets/opintopolku_logo_header_fi.svg";
import { OPINTOPOLKU_URL } from "./constants";

import { LanguageDropdown } from "./LanguageDropdown";
import { useTranslations } from "./useTranslations";
import { useLanguageState } from "./useLanguageState";
import { Box } from "@mui/system";

const PulssiAppBar = styled(AppBar)(() => ({
  position: "sticky",
  height: "auto",
  flexDirection: "row",
  alignItems: "center",
  padding: "10px 20px",
  minHeight: "75px",  
  justifyContent: "space-between"
}));

const getOpintopolkuHeaderLogo = (lang?: string | null) => {
  switch (lang) {
    case "fi":
      return opintopolkuLogoFi;
    case "en":
      return opintopolkuLogoEn;
    case "sv":
      return opintopolkuLogoSv;
    default:
      return opintopolkuLogoFi;
  }
};

const Heading = styled(Typography)(({theme}) => ({
  fontSize: "26px",
  fontWeight: 600,
  color: "white",
  lineHeight: "22px",
  [theme.breakpoints.down("sm")]: {
    fontSize: "18px"
  }
}));

const VisuallyHidden: React.FC = ({ children }) => (
  <span style={visuallyHidden}>{children}</span>
);

export const Header = () => {
  const { t } = useTranslations();

  const { lang } = useLanguageState();

  const OpintopolkuHeaderLogoSvg = getOpintopolkuHeaderLogo(lang);

  const theme = useTheme();

  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <PulssiAppBar>
      <Box display="flex" flexDirection={isSmall ? "column": "row"} flexWrap="wrap" justifyContent="flex-start" alignItems="flex-start" width="100%">
        <Link href={OPINTOPOLKU_URL} sx={{paddingRight: 3}}>
          <OpintopolkuHeaderLogoSvg
            focusable="false"
            aria-hidden="true"
            height="26px"
            width="auto"
          />
          <VisuallyHidden>{t("siirry_opintopolkuun")}</VisuallyHidden>
        </Link>
        <Heading>{t("sivu_otsikko")}</Heading>
      </Box>
      <LanguageDropdown />
    </PulssiAppBar>
  );
};
