import { json, type LoaderArgs } from "@remix-run/node";
import type { V2_MetaFunction } from "@remix-run/react";
import { Links, LiveReload, Meta, Outlet, Scripts, useLoaderData } from "@remix-run/react";
import i18next from "~/i18next.server";
import { useTranslation } from "react-i18next";
import { useChangeLanguage } from "./hooks/useChangeLanguage";

export const meta: V2_MetaFunction = ({data}) => {
  return [{
      title: data.title
    },
    { charSet: "utf-8"},
    {
      name: "viewport",
      content: "width=device-width,initial-scale=1"
    }
  ]
};

export const loader = async ({request}: LoaderArgs) => {
  let t = await i18next.getFixedT(request);
  let locale = await i18next.getLocale(request);
  let title = t(`sivu_otsikko.${locale}`);
  return json({ title, locale });
};

export const handle = {
  // In the handle export, we could add a i18n key with namespaces our route
  // will need to load. This key can be a single string or an array of strings.
  i18n: "common",
};

export default function App() {
  let { locale } = useLoaderData<typeof loader>();
  let { i18n } = useTranslation();
  
  useChangeLanguage(locale);
  
  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <Meta/>
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}