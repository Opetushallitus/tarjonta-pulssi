import { PassThrough, Writable } from "node:stream";

import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { pipeResponse, toMetadata, toRequest } from "../server/functionUrlAdapter";

const FUNCTION_URL_HOST = "abc123.lambda-url.eu-west-1.on.aws";

const createEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 =>
  ({
    version: "2.0",
    routeKey: "$default",
    rawPath: "/history",
    rawQueryString: "start=01.01.2026",
    headers: { host: FUNCTION_URL_HOST, "accept-language": "fi" },
    isBase64Encoded: false,
    requestContext: {
      domainName: FUNCTION_URL_HOST,
      http: { method: "GET", path: "/history" },
    },
    ...overrides,
  }) as APIGatewayProxyEventV2;

describe("toRequest", () => {
  it("muodostaa URL:n Function URL:n hostista, polusta ja kyselystä", () => {
    expect(toRequest(createEvent()).url).toBe(
      `https://${FUNCTION_URL_HOST}/history?start=01.01.2026`
    );
  });

  it("jättää kysymysmerkin pois, kun kyselyä ei ole", () => {
    expect(toRequest(createEvent({ rawQueryString: "" })).url).toBe(
      `https://${FUNCTION_URL_HOST}/history`
    );
  });

  it("välittää otsakkeet ja yhdistää evästeet", () => {
    const request = toRequest(createEvent({ cookies: ["a=1", "b=2"] }));
    expect(request.headers.get("accept-language")).toBe("fi");
    expect(request.headers.get("cookie")).toBe("a=1; b=2");
  });

  it("purkaa base64-koodatun bodyn muille kuin GET-pyynnöille", async () => {
    const event = createEvent({
      body: Buffer.from("hello").toString("base64"),
      isBase64Encoded: true,
    });
    event.requestContext.http.method = "POST";
    expect(await toRequest(event).text()).toBe("hello");
  });
});

describe("toMetadata", () => {
  it("palauttaa statuksen ja otsakkeet sekä evästeet erikseen", () => {
    const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
    headers.append("set-cookie", "a=1; Path=/");
    headers.append("set-cookie", "b=2; Path=/");

    expect(toMetadata(new Response("<html></html>", { status: 201, headers }))).toEqual({
      statusCode: 201,
      headers: { "content-type": "text/html; charset=utf-8" },
      cookies: ["a=1; Path=/", "b=2; Path=/"],
    });
  });
});

describe("pipeResponse", () => {
  const collect = async (response: Response) => {
    const stream = new PassThrough();
    const chunks: Array<Buffer> = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    const size = await pipeResponse(response, stream);
    return { size, body: Buffer.concat(chunks), ended: stream.writableEnded };
  };

  it("striimaa bodyn tavuina, palauttaa koon ja sulkee streamin", async () => {
    const bytes = new Uint8Array([0, 255, 1]);
    expect(await collect(new Response(bytes))).toEqual({
      size: 3,
      body: Buffer.from(bytes),
      ended: true,
    });
  });

  it("laskee koon tavuina eikä merkkeinä", async () => {
    expect((await collect(new Response("ä"))).size).toBe(2);
  });

  it("kirjoittaa streamiin myös ilman bodyä, jotta Function URL lähettää otsakkeet", async () => {
    let writes = 0;
    const stream = new Writable({
      write(_chunk, _encoding, callback) {
        writes++;
        callback();
      },
    });

    await pipeResponse(new Response(null, { status: 302 }), stream);

    expect(writes).toBe(1);
  });

  it("sulkee streamin myös ilman bodyä", async () => {
    expect(await collect(new Response(null, { status: 302 }))).toEqual({
      size: 0,
      body: Buffer.alloc(0),
      ended: true,
    });
  });
});
