import { createRequestHandler } from "@react-router/architect";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

// Käännetty palvelinbundle. Syntyy vasta `react-router build` -ajossa, eikä sitä
// siksi ole olemassa tuoreessa klonissa — eikä CI:ssä, joka ajaa lintin ennen
// buildia. Tästä seuraa kaksi asiaa:
//
//   1. Tiedosto on rajattu tsconfigin `exclude`-listalla typecheckin ulkopuolelle.
//      Mikään muu ei importtaa tätä, joten rajaus ei jätä muuta koodia
//      tarkistamatta.
//   2. `import/no-unresolved` on vaimennettu alta — polku on oikea, tiedosto vain
//      syntyy myöhemmin.
//
// eslint-disable-next-line import/no-unresolved
import * as build from "../build/server/index.js";

import { writeAccessLog } from "./accessLog";

/**
 * SSR-pyyntöjen käsittelijä. CloudFront kutsuu tätä Lambda Function URL:in kautta,
 * joka käyttää samaa payload-formaattia 2.0 kuin API Gatewayn HTTP API — siksi
 * architect-adapteri toimii sellaisenaan.
 */
const requestHandler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});

export const handler = async (event: APIGatewayProxyEventV2) => {
  const startedAt = Date.now();
  let response: APIGatewayProxyStructuredResultV2 | undefined;

  try {
    response = await requestHandler(event);
    return response;
  } finally {
    // `finally` kattaa myös poikkeustapauksen, jolloin `response` jää määrittelemättä
    // ja statukseksi kirjataan 500. Kirjoitus odotetaan loppuun ennen paluuta, koska
    // Lambda jäädyttää suoritusympäristön heti vastauksen jälkeen.
    await writeAccessLog({ event, response, durationMs: Date.now() - startedAt });
  }
};
