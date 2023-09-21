import type { SSTConfig } from "sst";
import { TARJONTAPULSSI } from "./stacks/tarjonta-pulssi";

export default {
  config(_input) {
    return {
      name: "tarjonta-pulssi-app",
      region: "eu-west-1",
    };
  },
  stacks(app) {
    app.stack(TARJONTAPULSSI);
  }
} satisfies SSTConfig;
