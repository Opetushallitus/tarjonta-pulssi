import { CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import mainStylesUrl from "~/app/styles/index.css?url";
import tableStylesUrl from "~/app/styles/table.css?url";

import { Header } from "./components/Header";
import { useChangeLanguage } from "./hooks/useChangeLanguage";
import { getFixedT, getLocale } from "./i18n.server";

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  return [
    {
      title: loaderData?.title,
    },
    { charSet: "utf-8" },
    {
      name: "viewport",
      content: "width=device-width,initial-scale=1",
    },
  ];
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: mainStylesUrl },
    { rel: "stylesheet", href: tableStylesUrl },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const locale = getLocale(request);
  const t = await getFixedT(locale);

  const url = new URL(request.url);
  const baseURL = `${url.protocol}//${url.host.split(".").slice(-2).join(".")}`;
  const title = t(`sivu_otsikko`);
  return { title, locale, baseURL };
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
  const { locale, baseURL } = useLoaderData<typeof loader>();
  const { i18n } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();

  const isHistoryVisible = location.pathname.endsWith("history");

  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <GlobalLoading />
        <div className="App">
          <Header
            historyOpen={isHistoryVisible}
            toggleHistory={() =>
              navigate({
                pathname: isHistoryVisible ? "/" : "history",
                search: location.search,
              })
            }
            baseURL={baseURL}
          />
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
