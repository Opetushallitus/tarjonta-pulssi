import { createRequestHandler } from "@react-router/architect";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

// Käännetty palvelinbundle. Syntyy vasta `react-router build` -ajossa, joten tämä
// tiedosto on rajattu tsconfigin `exclude`-listalla typecheckin ulkopuolelle —
// muuten `pnpm run typecheck` kaatuisi tuoreessa klonissa. Mikään muu ei importtaa
// tätä, joten rajaus ei jätä muuta koodia tarkistamatta.
import * as build from "../build/server/index.js";

/**
 * SSR-pyyntöjen käsittelijä. CloudFront kutsuu tätä Lambda Function URL:in kautta,
 * joka käyttää samaa payload-formaattia 2.0 kuin API Gatewayn HTTP API — siksi
 * architect-adapteri toimii sellaisenaan.
 */
const requestHandler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});

/**
 * Katsojan IP-osoite.
 *
 * `requestContext.http.sourceIp` ei kelpaa: se on välittömän TCP-yhteyden osapuoli
 * eli CloudFrontin reunapalvelin. CloudFront lisää katsojan oikean IP:n
 * `X-Forwarded-For` -ketjun **loppuun**, ja jos selain lähetti oman XFF-otsakkeen,
 * sen sisältö säilyy ketjun alussa. Viimeinen alkio on siis ainoa, jonka CloudFront
 * on itse havainnut eikä selain voi väärentää.
 *
 * Fallback kattaa tilanteen, jossa funktiota kutsutaan CloudFrontin ohi.
 */
const getViewerIp = (event: APIGatewayProxyEventV2) => {
  const forwardedFor = event.headers["x-forwarded-for"];
  return forwardedFor?.split(",").pop()?.trim() || event.requestContext.http.sourceIp;
};

/**
 * SSR-lambdan handler. Kirjoittaa jokaisesta pyynnöstä yhden JSON-rivin lambdan
 * omaan lokiryhmään, jolloin se on haettavissa Logs Insightsilla. Staattiset assetit
 * eivät kulje tätä kautta (CloudFront ohjaa ne S3:een), joten rivejä syntyy vain
 * HTML- ja data-pyynnöistä.
 *
 * Huom. `user-agent` on katsojan oikea otsake vain koska distribuutio käyttää
 * `ALL_VIEWER_EXCEPT_HOST_HEADER` -origin request policya. Ilman sitä CloudFront
 * korvaisi arvon merkkijonolla "Amazon CloudFront" — mikä rikkoisi myös
 * `isbot`-tunnistuksen entry.server.tsx:ssä.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  const startedAt = Date.now();
  let status = 500;

  try {
    const response = await requestHandler(event);
    status = response.statusCode ?? 200;
    return response;
  } finally {
    // `finally` kattaa myös poikkeustapauksen, jolloin status jää 500:ksi.
    console.log(
      JSON.stringify({
        type: "access",
        method: event.requestContext.http.method,
        path: event.rawPath,
        query: event.rawQueryString || undefined,
        status,
        durationMs: Date.now() - startedAt,
        ip: getViewerIp(event),
        userAgent: event.requestContext.http.userAgent,
        requestId: event.requestContext.requestId,
      })
    );
  }
};
