import { randomUUID } from "node:crypto";

import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { formatInTimeZone } from "date-fns-tz";

import { DEFAULT_TIMEZONE } from "~/shared/constants";

/** Muoto `2026-09-02T13:11:45.730+0300`, sama kuin muilla OPH:n access logeilla. */
const TIMESTAMP_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxx";

const logGroupName = process.env.ACCESS_LOG_GROUP;

const client = new CloudWatchLogsClient({ region: process.env.AWS_REGION });

/**
 * Yksi lokivirta suoritusympäristöä kohden. Lambdan oma virtanimi kelpaa
 * sellaisenaan: se on valmiiksi uniikki ja tekee korrelaatiosta sovelluslokiin
 * suoraviivaista, koska sama nimi löytyy molemmista lokiryhmistä.
 */
const logStreamName = process.env.AWS_LAMBDA_LOG_STREAM_NAME ?? `local/${randomUUID()}`;

let streamReady: Promise<void> | undefined;

const ensureLogStream = () => {
  streamReady ??= client
    .send(new CreateLogStreamCommand({ logGroupName, logStreamName }))
    .then(() => undefined)
    .catch((error: { name?: string }) => {
      // Virta voi olla jo olemassa, jos suoritusympäristö käynnistyy uudelleen.
      if (error?.name === "ResourceAlreadyExistsException") {
        return;
      }
      // Nollataan, jotta ohimenevä virhe ei jää jumittamaan kaikkia kirjoituksia.
      streamReady = undefined;
      throw error;
    });
  return streamReady;
};

export interface AccessLogContext {
  event: APIGatewayProxyEventV2;
  /** Puuttuu, jos käsittelijä kaatui ennen vastausta. */
  statusCode?: number;
  /** Vastauksen bodyn koko tavuina. */
  responseSize: number;
  durationMs: number;
}

/**
 * Katsojan IP-osoite.
 *
 * `requestContext.http.sourceIp` ei kelpaa: se on välittömän TCP-yhteyden osapuoli
 * eli CloudFrontin reunapalvelin. CloudFront lisää katsojan oikean IP:n
 * `X-Forwarded-For` -ketjun **loppuun**, ja jos selain lähetti oman XFF-otsakkeen,
 * sen sisältö säilyy ketjun alussa. Viimeinen alkio on siis ainoa, jonka CloudFront
 * on itse havainnut eikä selain voi väärentää.
 */
const getViewerIp = (event: APIGatewayProxyEventV2) =>
  event.headers["x-forwarded-for"]?.split(",").pop()?.trim() ?? event.requestContext.http.sourceIp;

/**
 * Kenttien nimet ja se, että arvot ovat merkkijonoja myös numeroiden kohdalla,
 * noudattavat muiden OPH-palveluiden access log -muotoa. `requestId` on lisä: sillä
 * rivin saa yhdistettyä SSR-lambdan omaan lokiin, jonne virheet ja pinolistaukset
 * menevät.
 */
export const buildAccessLogEntry = ({
  event,
  statusCode,
  responseSize,
  durationMs,
}: AccessLogContext) => {
  const { http, requestId } = event.requestContext;
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";

  return {
    timestamp: formatInTimeZone(new Date(), DEFAULT_TIMEZONE, TIMESTAMP_FORMAT),
    responseCode: String(statusCode ?? 500),
    request: `${http.method} ${event.rawPath}${query} ${http.protocol}`,
    responseTime: String(durationMs),
    requestMethod: http.method,
    service: "tarjonta-pulssi",
    environment: process.env.ENVIRONMENT ?? "",
    customer: "OPH",
    "user-agent": http.userAgent ?? "",
    "x-forwarded-for": event.headers["x-forwarded-for"] ?? "",
    "x-real-ip": getViewerIp(event),
    "remote-ip": http.sourceIp,
    "response-size": String(responseSize),
    referer: event.headers.referer ?? "",
    requestId,
  };
};

/**
 * Kirjoittaa yhden access-rivin omaan lokiryhmäänsä.
 *
 * Rivi kirjoitetaan rajapinnan kautta eikä `console.log`illa, koska Lambda ohjaa
 * stdoutin aina funktion omaan lokiryhmään ja lisää riville `timestamp requestId
 * INFO` -etuliitteen. Erillinen ryhmä ja jäsennettävä JSON edellyttävät siis
 * PutLogEvents-kutsua.
 */
export const writeAccessLog = async (context: AccessLogContext) => {
  const entry = buildAccessLogEntry(context);

  if (!logGroupName) {
    // Paikallisajossa lokiryhmää ei ole; rivi stdoutiin jotta se on silti nähtävissä.
    console.log(JSON.stringify(entry));
    return;
  }

  try {
    await ensureLogStream();
    await client.send(
      new PutLogEventsCommand({
        logGroupName,
        logStreamName,
        logEvents: [{ timestamp: Date.now(), message: JSON.stringify(entry) }],
      })
    );
  } catch (error) {
    // Lokituksen epäonnistuminen ei saa kaataa pyyntöä.
    console.error("Access-lokin kirjoitus epäonnistui", error);
  }
};
