// Tuo myös Lambdan globaalin `awslambda`-striimausrajapinnan tyypit.
import type { APIGatewayProxyEventV2 } from "aws-lambda";
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
import { pipeResponse, toMetadata, toRequest } from "./functionUrlAdapter";

const handleRequest = createRequestHandler(build as unknown as ServerBuild, process.env.NODE_ENV);

/**
 * SSR-pyyntöjen käsittelijä. CloudFront kutsuu tätä Lambda Function URL:in kautta,
 * jonka invoke mode on `RESPONSE_STREAM`, ks. `functionUrlAdapter.ts`.
 *
 * Striimaus on valittu siksi, että access logia ei tarvitse kirjoittaa ennen
 * vastausta: puskuroidussa tilassa Lambda jäädyttää suoritusympäristön heti
 * paluun jälkeen, joten PutLogEvents-kutsu olisi joka pyynnön viiveessä. Kun
 * stream on suljettu, katsoja on saanut vastauksen, ja käsittelijä saa jatkaa
 * lokin kirjoittamista ennen paluuta.
 */
export const handler = awslambda.streamifyResponse<APIGatewayProxyEventV2>(
  async (event, responseStream) => {
    const startedAt = Date.now();
    let statusCode: number | undefined;
    let responseSize = 0;

    try {
      const response = await handleRequest(toRequest(event));
      statusCode = response.status;
      responseSize = await pipeResponse(
        response,
        awslambda.HttpResponseStream.from(responseStream, toMetadata(response))
      );
    } finally {
      // `finally` kattaa myös poikkeustapauksen, jolloin `statusCode` jää
      // määrittelemättä ja statukseksi kirjataan 500.
      await writeAccessLog({ event, statusCode, responseSize, durationMs: Date.now() - startedAt });
    }
  }
);
