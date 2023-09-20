import { AppBar, IconButton, Link, Typography, styled, useMediaQuery, useTheme } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

import { LanguageDropdown } from "./LanguageDropdown";
import MenuIcon from "@mui/icons-material/Menu"
import CloseIcon from "@mui/icons-material/Close"
import { Box } from "@mui/system";
import opintopolku_logo_header_fi from "~/assets/opintopolku_logo_header_fi.svg";
import opintopolku_logo_header_en from "~/assets/opintopolku_logo_header_en.svg";
import opintopolku_logo_header_sv from "~/assets/opintopolku_logo_header_sv.svg";
import { InlineSvgIcon } from "./InlineSvgIcon";
import { useTranslation } from "react-i18next";
import React from "react";

const classes = {
  historyButtonSection: "historyButtonSection",
  historyButton: "historyButton",
  historyButtonText: "historyButtonText",
};

const PulssiAppBar = styled(AppBar)(({theme}) => ({
  position: "sticky",
  height: "auto",
  flexDirection: "row",
  alignItems: "center",
  padding: "10px 20px",
  minHeight: "75px",  
  justifyContent: "space-between",
  [`& .${classes.historyButtonSection}`]: {
    marginLeft: theme.spacing(2),
  },

  [`& .${classes.historyButton}`]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  [`& .${classes.historyButtonText}`]: {
    fontSize: 'small',
    color: "rgb(255, 255, 255)",
  },
}));

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

const Heading = styled(Typography)(({theme}) => ({
  fontSize: "26px",
  fontWeight: 600,
  color: "white",
  lineHeight: "22px",
  letterSpacing: "1px",
  [theme.breakpoints.down("sm")]: {
    fontSize: "18px"
  }
}));

export type HeaderProps = {
  historyOpen: boolean;
  toggleHistory: () => void;
}

export const Header = (props: HeaderProps) => {
  const { i18n, t } = useTranslation()

  const theme = useTheme();

  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const VisuallyHidden: React.FC = () => (
    <span style={visuallyHidden}/>
  );
    
  const OPINTOPOLKU_URL = "https://opintopolku.fi";
    // TODO fixaa lokaation selvitys
    // window.location.protocol +
    // "//" +
    // window.location.host.split(".").slice(-2).join(".");

  return (
    <PulssiAppBar>
      <Box display="flex" flexDirection={isSmall ? "column": "row"} flexWrap="wrap" justifyContent="flex-start" alignItems="center" width="100%">
        <Link href={OPINTOPOLKU_URL} sx={{paddingRight: 3}}>
          <InlineSvgIcon 
            src={getOpintopolkuHeaderLogoSrc(i18n.language)}
            focusable="false"
            aria-hidden="true"
            height="26px"
            width="auto"
          />
          <VisuallyHidden />
        </Link>
        <Heading variant="h1">{t('sivu_otsikko')}</Heading>
        <IconButton
          color="inherit"
          aria-label={t('muutoshistoria-sulje-valikko')}
          onClick={props.toggleHistory}
          edge="start"
          className={classes.historyButtonSection}>
          <Box className={classes.historyButton}>
            {props.historyOpen ? <CloseIcon /> : <MenuIcon />}
            <Typography className={classes.historyButtonText}>{props.historyOpen ? t('sulje_muutoshistoria') : t('nayta_muutoshistoria')}</Typography>
          </Box>
        </IconButton>
      </Box>
      <LanguageDropdown />
    </PulssiAppBar>
  );
};
