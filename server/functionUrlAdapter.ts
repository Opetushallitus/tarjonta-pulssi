import { Readable, type Writable } from "node:stream";
import { finished, pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import type { APIGatewayProxyEventV2 } from "aws-lambda";

/**
 * Muuntaa Function URL -tapahtuman (payload-formaatti 2.0) Fetch API:n `Request`iksi.
 *
 * CloudFront ei välitä katsojan Host-otsaketta, koska Function URL reitittää sen
 * perusteella. URL:n hostina on siksi Function URL:n oma osoite
 * (`xxxx.lambda-url.<region>.on.aws`), joten sovellus ei saa käyttää sitä.
 */
export const toRequest = (event: APIGatewayProxyEventV2): Request => {
  const { method } = event.requestContext.http;
  const search = event.rawQueryString ? `?${event.rawQueryString}` : "";

  // Function URL:n otsakkeissa ei ole `undefined`-arvoja, vaikka tyyppi sallii ne.
  const headers = new Headers(event.headers as Record<string, string>);
  // Payload 2.0 siirtää evästeet `cookie`-otsakkeesta omaan kenttäänsä.
  if (event.cookies?.length) headers.set("cookie", event.cookies.join("; "));

  // Fetch API ei salli bodyä GET- ja HEAD-pyynnöille.
  const encoding = event.isBase64Encoded ? "base64" : "utf8";
  const body =
    event.body !== undefined && method !== "GET" && method !== "HEAD"
      ? Buffer.from(event.body, encoding)
      : null;

  return new Request(`https://${event.requestContext.domainName}${event.rawPath}${search}`, {
    method,
    headers,
    body,
  });
};

/**
 * Striimatun vastauksen alkuosa, jonka `awslambda.HttpResponseStream.from` ottaa.
 * `Record`-perintä antaa interfacelle indeksisignatuuren, jota sen parametrityyppi
 * vaatii.
 */
export interface ResponseMetadata extends Record<string, unknown> {
  statusCode: number;
  headers: Record<string, string>;
  cookies: Array<string>;
}

export const toMetadata = (response: Response): ResponseMetadata => ({
  statusCode: response.status,
  // `Set-Cookie`-otsakkeita ei voi yhdistää pilkulla, joten ne välitetään omassa
  // `cookies`-kentässään.
  headers: Object.fromEntries([...response.headers].filter(([name]) => name !== "set-cookie")),
  cookies: response.headers.getSetCookie(),
});

/**
 * Striimaa vastauksen bodyn sellaisenaan (ilman base64-koodausta) ja sulkee
 * streamin. Palauttaa bodyn koon tavuina access logia varten.
 */
export const pipeResponse = async (response: Response, stream: Writable): Promise<number> => {
  if (!response.body) {
    // Function URL lähettää statuksen ja otsakkeet vasta ensimmäisen kirjoituksen
    // yhteydessä, joten bodyttömälle vastaukselle (uudelleenohjaus, HEAD) tehdään
    // tyhjä kirjoitus. Ks. https://github.com/fastify/aws-lambda-fastify/issues/154#issuecomment-2614521719
    stream.end("");
    await finished(stream);
    return 0;
  }

  let size = 0;
  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
    async function* (source: AsyncIterable<Uint8Array>) {
      for await (const chunk of source) {
        size += chunk.byteLength;
        yield chunk;
      }
    },
    stream
  );

  return size;
};
