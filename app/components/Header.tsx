import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  IconButton,
  Link,
  Typography,
  styled,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Box } from "@mui/system";
import { visuallyHidden } from "@mui/utils";
import { useTranslation } from "react-i18next";

import opintopolku_logo_header_en from "~/app/assets/opintopolku_logo_header_en.svg";
import opintopolku_logo_header_fi from "~/app/assets/opintopolku_logo_header_fi.svg";
import opintopolku_logo_header_sv from "~/app/assets/opintopolku_logo_header_sv.svg";

import { LanguageDropdown } from "./LanguageDropdown";

const PulssiAppBar = styled(AppBar)({
  position: "sticky",
  height: "auto",
  flexDirection: "row",
  alignItems: "center",
  padding: "10px 20px",
  minHeight: "75px",
  justifyContent: "space-between",
  color: "theme.pallette.primary.main",
});

const getOpintopolkuHeaderLogoSrc = (lang?: string | null) => {
  switch (lang) {
    case "fi":
      return opintopolku_logo_header_fi;
    case "en":
      return opintopolku_logo_header_en;
    case "sv":
      return opintopolku_logo_header_sv;
    default:
      return opintopolku_logo_header_fi;
  }
};

const Heading = styled(Typography)(({ theme }) => ({
  fontSize: "26px",
  fontWeight: 600,
  color: "white",
  lineHeight: "22px",
  letterSpacing: "1px",
  [theme.breakpoints.down("sm")]: {
    fontSize: "18px",
  },
}));

const HistoryButtonContent = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
});

export interface URLData {
  protocol: string;
  host: string;
}
export interface HeaderProps {
  historyOpen: boolean;
  toggleHistory: () => void;
  currentUrl: URLData;
}

const VisuallyHidden: React.FC<{ children: string }> = ({ children }: React.PropsWithChildren) => (
  <span style={visuallyHidden}>{children}</span>
);

export const Header = (props: HeaderProps) => {
  const { i18n, t } = useTranslation();

  const theme = useTheme();

  const isSmallDisplay = useMediaQuery(theme.breakpoints.down("sm"));

  const getOpintopolkuUrl = () =>
    `${props.currentUrl.protocol}//${props.currentUrl.host.split(".").slice(-2).join(".")}`;

  return (
    <PulssiAppBar>
      <Box
        display="flex"
        flexDirection={isSmallDisplay ? "column" : "row"}
        flexWrap="wrap"
        justifyContent="flex-start"
        alignItems={isSmallDisplay ? "flex-start" : "center"}
        width="100%"
      >
        <Link href={getOpintopolkuUrl()} sx={{ paddingRight: 3 }}>
          <img
            src={getOpintopolkuHeaderLogoSrc(i18n.language)}
            aria-hidden={true}
            height="26px"
            alt=""
          />
          <VisuallyHidden>{t("siirry_opintopolkuun")}</VisuallyHidden>
        </Link>
        <Heading variant="h1">{t("sivu_otsikko")}</Heading>
        <IconButton
          color="inherit"
          aria-label={t("muutoshistoria-sulje-valikko")}
          onClick={props.toggleHistory}
          edge="start"
          sx={{ marginLeft: (theme) => theme.spacing(2) }}
        >
          <HistoryButtonContent>
            {props.historyOpen ? <CloseIcon /> : <MenuIcon />}
            <Typography sx={{ fontSize: "small", color: "rgb(255, 255, 255)" }}>
              {props.historyOpen ? t("sulje_muutoshistoria") : t("nayta_muutoshistoria")}
            </Typography>
          </HistoryButtonContent>
        </IconButton>
      </Box>
      <LanguageDropdown />
    </PulssiAppBar>
  );
};
