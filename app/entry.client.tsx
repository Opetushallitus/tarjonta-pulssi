import { ThemeProvider } from "@mui/material";
import i18next from "i18next";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";

import i18nConfig from "./i18n";
import theme from "./theme";
import { translationResources } from "./translations";

async function hydrate() {
  // eslint-disable-next-line import/no-named-as-default-member
  await i18next.use(initReactI18next).init({
    ...i18nConfig,
    // Palvelin on jo päättänyt kielen ja kertonut sen <html lang> -attribuutissa,
    // joten erillistä selainpuolen tunnistusta ei tarvita.
    lng: document.documentElement.lang,
    ns: [i18nConfig.defaultNS],
    resources: translationResources,
  });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <ThemeProvider theme={theme}>
            <HydratedRouter />
          </ThemeProvider>
        </StrictMode>
      </I18nextProvider>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
