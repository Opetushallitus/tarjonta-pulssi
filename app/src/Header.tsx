import { AppBar, Link, Typography, styled } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import { ReactComponent as opintopolkuLogoEn } from "./assets/opintopolku_logo_header_en.svg";
import { ReactComponent as opintopolkuLogoSv } from "./assets/opintopolku_logo_header_sv.svg";
import { ReactComponent as opintopolkuLogoFi } from "./assets/opintopolku_logo_header_fi.svg";
import { OPINTOPOLKU_URL } from "./constants";

import { LanguageDropdown } from "./LanguageDropdown";
import { useTranslations } from "./useTranslations";
import { useLanguageState } from "./useLanguageState";

const PulssiAppBar = styled(AppBar)(() => ({
  position: "sticky",
  height: "auto",
  flexDirection: "row",
  alignItems: "center",
  padding: "10px 20px",
  justifyContent: "space-between",
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

const Heading = styled(Typography)`
  font-size: 35px;
  font-weight: 600;
  color: white;
`;

const VisuallyHidden: React.FC = ({ children }) => (
  <span style={visuallyHidden}>{children}</span>
);

export const Header = () => {
  const { t } = useTranslations();

  const {lang} = useLanguageState();

  const OpintopolkuHeaderLogoSvg = getOpintopolkuHeaderLogo(lang);

  return (
    <PulssiAppBar>
      <Link href={OPINTOPOLKU_URL}>
        <OpintopolkuHeaderLogoSvg focusable="false" aria-hidden="true" />
        <VisuallyHidden>{t("siirry_opintopolkuun")}</VisuallyHidden>
      </Link>
      <Heading>{t("sivu_otsikko")}</Heading>
      <LanguageDropdown />
    </PulssiAppBar>
  );
};
