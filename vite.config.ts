import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  // Sovellusta on aina ajettu lokaalisti portissa 3000, ks. README.
  server: { port: 3000 },
  // MUI v5 ei julkaise `exports`-karttaa, joten ulkoisena Node lataa ikonien
  // CJS-version, jonka default-import rikkoo dev-SSR:n ("Element type is invalid").
  // Bundlattuna Vite käyttää pakettien ESM-versiota. Ikonit tuodaan yksittäin
  // `esm/`-hakemistosta (`@mui/icons-material/esm/Close`), koska pääindeksin kautta Vite
  // muuntaisi dev-SSR:ssä kaikki ~10 000 ikonia. Tyypit: `app/mui-icons.d.ts`. Voi
  // poistaa MUI v7:n myötä, jossa paketit julkaisevat oikean ESM:n.
  ssr: { noExternal: ["@mui/icons-material"] },
});
