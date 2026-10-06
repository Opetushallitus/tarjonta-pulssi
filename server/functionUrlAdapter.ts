import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

/**
 * Tekstimuotoiset vastaukset palautetaan sellaisenaan, kaikki muu base64-koodattuna.
 * React Routerin omat vastaukset (HTML ja `.data`-pyyntöjen `text/x-script`) ovat
 * tekstiä.
 */
const TEXT_CONTENT_TYPE = /^(text\/|application\/(json|javascript|xml)\b|[^;]*\+(json|xml)\b)/i;

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

/** Muuntaa Fetch API:n `Response`n Function URL:n odottamaan muotoon. */
export const toResult = async (response: Response): Promise<APIGatewayProxyStructuredResultV2> => {
  const isBase64Encoded =
    response.body !== null && !TEXT_CONTENT_TYPE.test(response.headers.get("content-type") ?? "");

  return {
    statusCode: response.status,
    // `Set-Cookie`-otsakkeita ei voi yhdistää pilkulla, joten ne palautetaan
    // payload 2.0:n `cookies`-kentässä.
    headers: Object.fromEntries([...response.headers].filter(([name]) => name !== "set-cookie")),
    cookies: response.headers.getSetCookie(),
    body: isBase64Encoded
      ? Buffer.from(await response.arrayBuffer()).toString("base64")
      : await response.text(),
    isBase64Encoded,
  };
};

/**
 * Kääri Fetch API -pohjaisen käsittelijän (esim. React Routerin
 * `createRequestHandler`) Function URL -tapahtumia käsitteleväksi funktioksi.
 */
export const toFunctionUrlHandler =
  (handleRequest: (request: Request) => Promise<Response>) =>
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> =>
    toResult(await handleRequest(toRequest(event)));
