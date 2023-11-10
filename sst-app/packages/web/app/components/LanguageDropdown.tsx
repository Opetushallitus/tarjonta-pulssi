import React from "react";

import LanguageIcon from "@mui/icons-material/Language";
import { Select, MenuItem, InputBase, Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { LANGUAGES_BY_CODE } from "~/constants";
import { SUPPORTED_LANGUAGES } from "../../../shared/constants"
import { useTranslation } from "react-i18next";
import { useFetcher } from "@remix-run/react";

const CustomInput = styled(InputBase)({
  color: "white"
});

export const LanguageDropdown = () => {
  const {i18n} = useTranslation()

  const fetcher = useFetcher();
  const onLanguageChange = (e: any) => {
    fetcher.submit({lng: e.target.value}, {method: 'POST'})
  }
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
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
        value={i18n.language}
        open={open}
        onClose={handleClose}
        onOpen={handleOpen}
        onChange={onLanguageChange}
        input={<CustomInput />}
        renderValue={(value) => value?.toUpperCase()}
      >
        {SUPPORTED_LANGUAGES.map((langCode) => (
          <MenuItem key={langCode} value={langCode}>
            {LANGUAGES_BY_CODE[langCode] ?? langCode}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};