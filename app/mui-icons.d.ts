// MUI v5:n ikonipaketin `esm/`-hakemistossa ei ole tyyppimäärittelyjä. Tyypitetään ikonit
// samoin kuin paketin juuressa, ks. `vite.config.ts`.
declare module "@mui/icons-material/esm/*" {
  export { default } from "@mui/material/SvgIcon";
}
