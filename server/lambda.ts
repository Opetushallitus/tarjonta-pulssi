import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createRequestHandler, type ServerBuild } from "react-router";

// Käännetty palvelinbundle. Syntyy vasta `react-router build` -ajossa, eikä sitä
// siksi ole olemassa tuoreessa klonissa — eikä CI:ssä, joka ajaa lintin ennen
// buildia. Tästä seuraa kaksi asiaa:
//
//   1. Tiedosto on rajattu tsconfigin `exclude`-listalla typecheckin ulkopuolelle.
//      Mikään muu ei importtaa tätä, joten rajaus ei jätä muuta koodia
//      tarkistamatta. Pyyntöjen muunnos on siksi erillisessä, tarkistetussa
//      moduulissa `functionUrlAdapter.ts`.
//   2. `import/no-unresolved` on vaimennettu alta — polku on oikea, tiedosto vain
//      syntyy myöhemmin.
//
// eslint-disable-next-line import/no-unresolved
import * as build from "../build/server/index.js";

import { writeAccessLog } from "./accessLog";
import { toFunctionUrlHandler } from "./functionUrlAdapter";

/**
 * SSR-pyyntöjen käsittelijä. CloudFront kutsuu tätä Lambda Function URL:in kautta,
 * ks. `functionUrlAdapter.ts`.
 */
const handleRequest = toFunctionUrlHandler(
  createRequestHandler(build as unknown as ServerBuild, process.env.NODE_ENV)
);

export const handler = async (event: APIGatewayProxyEventV2) => {
  const startedAt = Date.now();
  let response: APIGatewayProxyStructuredResultV2 | undefined;

  try {
    response = await handleRequest(event);
    return response;
  } finally {
    // `finally` kattaa myös poikkeustapauksen, jolloin `response` jää määrittelemättä
    // ja statukseksi kirjataan 500. Kirjoitus odotetaan loppuun ennen paluuta, koska
    // Lambda jäädyttää suoritusympäristön heti vastauksen jälkeen.
    await writeAccessLog({ event, response, durationMs: Date.now() - startedAt });
  }
};
