import { CircularProgress } from "@mui/material";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useTranslation } from "react-i18next";

import i18next from "~/app/i18next.server";

import { useChangeLanguage } from "./hooks/useChangeLanguage";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: data?.title,
    },
    { charSet: "utf-8" },
    {
      name: "viewport",
      content: "width=device-width,initial-scale=1",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const t = await i18next.getFixedT(request);
  const locale = await i18next.getLocale(request);
  const title = t(`sivu_otsikko`);
  return json({ title, locale });
};

export const handle = {
  // In the handle export, we could add a i18n key with namespaces our route
  // will need to load. This key can be a single string or an array of strings.
  i18n: "common",
};

function GlobalLoading() {
  const loadingInfo = useNavigation();
  const loading = loadingInfo.state !== "idle";

  return (
    <div>
      {loading ? (
        <CircularProgress
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
          }}
          size={75}
          color="inherit"
        />
      ) : null}
    </div>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  const { i18n } = useTranslation();

  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <GlobalLoading />
        <Outlet />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
