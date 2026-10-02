import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  // Sovellusta on aina ajettu lokaalisti portissa 3000, ks. README.
  server: { port: 3000 },
});
