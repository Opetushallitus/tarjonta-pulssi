import LanguageIcon from "@mui/icons-material/Language";
import { Select, MenuItem, InputBase, Box, SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useSearchParams } from "@remix-run/react";
import React from "react";
import { useTranslation } from "react-i18next";

import { LANGUAGES_BY_CODE } from "~/app/constants";
import { SUPPORTED_LANGUAGES } from "~/shared/constants";

const CustomInput = styled(InputBase)({
  color: "white",
});

export const LanguageDropdown = () => {
  const { i18n } = useTranslation();

  const [, setSearchParams] = useSearchParams();
  const onLanguageChange = (e: SelectChangeEvent) => {
    setSearchParams((prev) => {
      prev.set("lng", e.target.value);
      return prev;
    });
  };
  const [open, setOpen] = React.useState(false);
  const toggle = () => {
    setOpen((isOpen) => !isOpen);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <LanguageIcon onClick={toggle} style={{ paddingRight: "9px", cursor: "pointer" }} />
      <Select
        sx={{
          textTransform: "uppercase",
          "& .MuiSelect-icon": {
            fill: "white",
          },
        }}
        MenuProps={{
          disableScrollLock: true,
        }}
        value={i18n.language}
        open={open}
        onClose={toggle}
        onOpen={toggle}
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
