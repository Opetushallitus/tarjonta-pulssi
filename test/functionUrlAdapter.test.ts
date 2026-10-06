import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { toFunctionUrlHandler, toRequest, toResult } from "../server/functionUrlAdapter";

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

describe("toResult", () => {
  it("palauttaa tekstivastauksen sellaisenaan ja evästeet erikseen", async () => {
    const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
    headers.append("set-cookie", "a=1; Path=/");
    headers.append("set-cookie", "b=2; Path=/");

    const result = await toResult(new Response("<html></html>", { status: 200, headers }));

    expect(result).toEqual({
      statusCode: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      cookies: ["a=1; Path=/", "b=2; Path=/"],
      body: "<html></html>",
      isBase64Encoded: false,
    });
  });

  it("käsittelee React Routerin data-vastaukset tekstinä", async () => {
    const result = await toResult(
      new Response("[]", { headers: { "content-type": "text/x-script" } })
    );
    expect(result.isBase64Encoded).toBe(false);
  });

  it("base64-koodaa binäärivastaukset", async () => {
    const bytes = new Uint8Array([0, 255, 1]);
    const result = await toResult(
      new Response(bytes, { headers: { "content-type": "image/png" } })
    );
    expect(result.isBase64Encoded).toBe(true);
    expect(Buffer.from(result.body!, "base64")).toEqual(Buffer.from(bytes));
  });

  it("palauttaa tyhjän bodyn uudelleenohjaukselle", async () => {
    const result = await toResult(
      new Response(null, { status: 302, headers: { location: "/fi" } })
    );
    expect(result).toMatchObject({
      statusCode: 302,
      headers: { location: "/fi" },
      body: "",
      isBase64Encoded: false,
    });
  });
});

describe("toFunctionUrlHandler", () => {
  it("välittää muunnetun pyynnön käsittelijälle ja muuntaa vastauksen", async () => {
    const handleRequest = jest.fn(
      async (request: Request) =>
        new Response(new URL(request.url).pathname, { headers: { "content-type": "text/plain" } })
    );

    const result = await toFunctionUrlHandler(handleRequest)(createEvent());

    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ statusCode: 200, body: "/history", isBase64Encoded: false });
  });
});
