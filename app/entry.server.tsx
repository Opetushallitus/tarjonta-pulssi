/**
 * By default, React Router will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again,
 * you can run `pnpm exec react-router reveal` ✨
 * For more information, see https://reactrouter.com/explanation/special-files#entryservertsx
 */

import { PassThrough } from "node:stream";

import { ThemeProvider } from "@mui/material";
import { createReadableStreamFromReadable } from "@react-router/node";
import { createInstance } from "i18next";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { I18nextProvider, initReactI18next, type ReportNamespaces } from "react-i18next";
import { ServerRouter, type EntryContext } from "react-router";

import i18nConfig from "./i18n";
import { getLocale } from "./i18n.server";
import theme from "./theme";
import { translationResources } from "./translations";

const ABORT_DELAY = 5_000;

// For an obscure reason i18n type augmentation present in react-i18next/ts4.1/index.d.ts
// (and/or react-i18next/index.d.ts) aren't considered when using I18nextProvider
// @see https://github.com/i18next/react-i18next/issues/1379
declare module "i18next" {
  interface i18n {
    reportNamespaces: ReportNamespaces;
  }
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  const callbackName = isbot(request.headers.get("user-agent")) ? "onAllReady" : "onShellReady";

  // Renderöinnin i18next-instanssi luodaan pyyntökohtaisesti, jotta react-i18next:n
  // instanssikohtainen tila ei vuoda pyyntöjen välillä.
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    ...i18nConfig,
    lng: getLocale(request),
    ns: [i18nConfig.defaultNS],
    resources: translationResources,
  });

  return new Promise<Response>((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <ThemeProvider theme={theme}>
          <ServerRouter context={routerContext} url={request.url} />
        </ThemeProvider>
      </I18nextProvider>,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          didError = true;
          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
