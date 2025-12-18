/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `pnpm exec remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import { PassThrough } from "stream";

import { ThemeProvider } from "@mui/material";
import { createReadableStreamFromReadable, type EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { createInstance } from "i18next";
import Backend from "i18next-fs-backend";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { I18nextProvider, initReactI18next, ReportNamespaces } from "react-i18next";

import i18n from "./i18n";
import i18next from "./i18next.server";
import theme from "./theme";
import { getTranslationsForLanguage } from "./translations";

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
  remixContext: EntryContext
) {
  const callbackName = isbot(request.headers.get("user-agent")) ? "onAllReady" : "onShellReady";

  const instance = createInstance();
  const lng = await i18next.getLocale(request);
  const ns = i18next.getRouteNamespaces(remixContext);

  await instance
    .use(initReactI18next) // Tell our instance to use react-i18next
    .use(Backend) // Setup our backend
    .init({
      ...i18n, // spread the configuration
      lng, // The locale we detected above
      ns, // The namespaces the routes about to render wants to use
      resources: {
        fi: getTranslationsForLanguage("fi"),
        sv: getTranslationsForLanguage("sv"),
        en: getTranslationsForLanguage("en"),
      },
      //debug: true,
    });
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <ThemeProvider theme={theme}>
          <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
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
