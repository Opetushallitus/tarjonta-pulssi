import { createRequestHandler } from "@react-router/architect";

// Käännetty palvelinbundle. Syntyy vasta `react-router build` -ajossa, joten tämä
// tiedosto on rajattu tsconfigin `exclude`-listalla typecheckin ulkopuolelle —
// muuten `pnpm run typecheck` kaatuisi tuoreessa klonissa. Mikään muu ei importtaa
// tätä, joten rajaus ei jätä muuta koodia tarkistamatta.
import * as build from "../build/server/index.js";

/**
 * SSR-lambdan handler. CloudFront kutsuu tätä Lambda Function URL:in kautta, joka
 * käyttää samaa payload-formaattia 2.0 kuin API Gatewayn HTTP API — siksi
 * architect-adapteri toimii sellaisenaan.
 */
export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
