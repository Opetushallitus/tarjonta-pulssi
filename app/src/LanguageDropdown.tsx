import React from "react";

import LanguageIcon from "@mui/icons-material/Language";
import { Select, MenuItem, InputBase, Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { useLanguageState } from "./useLanguageState";
import { useTranslations } from "./useTranslations";
import { SUPPORTED_LANGUAGES } from "./constants";

const CustomInput = styled(InputBase)({
  fontSize: "small",
  color: "white"
});

export const LanguageDropdown = () => {
  const { t } = useTranslations();
  const { lang, setLang } = useLanguageState();

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleChange = (event: any) => {
    setLang(event.target.value as string);
  };
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <LanguageIcon
        onClick={open ? handleClose : handleOpen}
        style={{ paddingRight: "9px", cursor: "pointer" }}
      />
      <Select
        sx={{
          textTransform: "uppercase",
          "& .MuiSelect-icon": {
            fill: "white"
          }
        }}
        MenuProps={{
          disableScrollLock: true
        }}
        value={lang}
        open={open}
        onClose={handleClose}
        onOpen={handleOpen}
        onChange={handleChange}
        input={<CustomInput />}
      >
        {SUPPORTED_LANGUAGES.map((langCode) => (
          <MenuItem key={langCode} value={langCode}>
            {t(`kieli.${langCode}`) ?? langCode}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};
