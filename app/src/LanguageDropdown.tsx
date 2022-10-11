import React from "react";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import LanguageIcon from "@mui/icons-material/Language";
import { Select, MenuItem, InputBase, Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { useLanguageState } from "./useLanguageState";
import { useTranslations } from "./useTranslations";
import { SUPPORTED_LANGUAGES, colors } from "./constants";

const styles = {
  fontSize: "small",
  color: "white",
};

const StyledIconComponent = styled(ArrowDropDownIcon)({
  fill: "white",
});

const CustomInput = styled(InputBase)(styles);

export const LanguageDropdown = () => {
  const { t } = useTranslations();
  // TODO: any pois
  const [language, setLanguage]: any = useLanguageState();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleChange = (event: any) => {
    setLanguage(event.target.value as string);
  };
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <LanguageIcon
        onClick={open ? handleClose : handleOpen}
        style={{ cursor: "pointer" }}
      />
      <Select
        style={{ textTransform: "uppercase" }}
        MenuProps={{
          disableScrollLock: true,
        }}
        value={language as string}
        open={open}
        onClose={handleClose}
        onOpen={handleOpen}
        onChange={handleChange}
        input={<CustomInput />}
        IconComponent={StyledIconComponent}
      >
        {SUPPORTED_LANGUAGES.map((langCode) => (
          <MenuItem
            key={langCode}
            value={langCode}
            style={{
              fontSize: "small",
              color: colors.black,
              backgroundColor: colors.white,
            }}
          >
            {t(`kieli.${langCode}`) ?? langCode}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};
