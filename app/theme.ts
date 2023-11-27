import { createTheme } from "@mui/material";
import { fiFI } from "@mui/x-date-pickers";

const theme = createTheme(
  {
    palette: {
      primary: {
        main: "#3A7A10", //brandGreen
      },
    },
  },
  fiFI
);

export default theme;
