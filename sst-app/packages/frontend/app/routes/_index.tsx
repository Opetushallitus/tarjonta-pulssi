import { Box, Paper, Typography, styled } from "@mui/material";
import { EntityTable } from "~/components/EntityTable";
import type { URLData } from "~/components/Header";
import { Header } from "~/components/Header";
import type {
  EntityType,
  EntityDataWithSubKey,
  PulssiData,
} from "../../../shared/types";
import { ICONS } from "~/constants";
import {
  type LoaderFunction,
  type ActionFunction,
  type LinksFunction,
  redirect,
} from "@remix-run/node";
import {
  getCurrentAmountData,
  getHistoryAmountData,
} from "~/servers/amount.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import mainStylesUrl from "~/styles/index.css";
import tableStylesUrl from "~/styles/table.css";
import { useTranslation } from "react-i18next";
import { HistorySearchSection } from "~/components/HistorySearchSection";
import { format } from "date-fns";
import { DATETIME_FORMAT } from "../../../shared/constants";
import { parseDate } from "../../../shared/amountDataUtils";
import { useMemo } from "react";

const StyledEntitySection = styled(Paper)`
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  background-color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 1;
  flex-grow: 1;
  flex-basis: auto;
  max-width: 550px;
  margin-right: 15px;
  margin-top: 15px;
  margin-bottom: 15px;
`;

const StyledEntitySectionHeader = styled(Box)`
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  padding: 20px;
  align-items: center;
  justify-content: center;
`;

const SectionHeading = styled(Typography)`
  font-size: 1.5rem;
  font-weight: 550;
  text-align: left;
  margin: 0;
  padding-left: 14px;
`;

const EntitySection = ({
  entity,
  data,
}: {
  entity: EntityType;
  data: EntityDataWithSubKey;
}) => {
  const { t } = useTranslation();

  const IconComponent = ICONS[entity];
  return (
    <StyledEntitySection>
      <StyledEntitySectionHeader>
        <IconComponent />
        <SectionHeading variant="h2">{t(`${entity}_otsikko`)}</SectionHeading>
      </StyledEntitySectionHeader>
      <EntityTable data={data} entity={entity} />
    </StyledEntitySection>
  );
};

type ServerSideData = {
  data: PulssiData;
  currentUrl: URLData;
  showHistory?: boolean;
  historyStart?: string;
  historyEnd?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const currentUrl: URLData = { protocol: url.protocol, host: url.host };
  const showHistoryVal = url.searchParams.get("showHistory");
  const showHistory =
    showHistoryVal !== null && showHistoryVal.toLowerCase() !== "false";
  const historyStart = url.searchParams.get("start");
  const historyEnd = url.searchParams.get("end");
  if (showHistory || historyStart || historyEnd) {
    const data = await getHistoryAmountData(historyStart, historyEnd);
    return { data, currentUrl, showHistory: true, historyStart, historyEnd };
  }
  return { data: await getCurrentAmountData(), currentUrl, showHistory: false };
};

const setSearchParameter = (
  paramName: string,
  formData: FormData,
  searchParameters: URLSearchParams,
  deleteNonExisting: boolean = false
) => {
  const paramValue = formData.get(paramName);
  if (paramValue) {
    searchParameters.set(paramName, paramValue.toString());
  } else if (deleteNonExisting) {
    searchParameters.delete(paramName);
  }
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const url = new URL(request.url);
  const newUrl = new URL(url);
  const newSearchParams = new URLSearchParams(url.search);
  setSearchParameter("lng", formData, newSearchParams);
  const showHistory =
    formData.has("showHistory") &&
    formData.get("showHistory")?.toString() === "true";
  if (showHistory) {
    newSearchParams.set("showHistory", "true");
    setSearchParameter("start", formData, newSearchParams, true);
    setSearchParameter("end", formData, newSearchParams, true);
  } else {
    newSearchParams.delete("showHistory");
    newSearchParams.delete("start");
    newSearchParams.delete("end");
  }
  newUrl.search = newSearchParams.toString();
  return redirect(newUrl.toString());
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: mainStylesUrl },
    { rel: "stylesheet", href: tableStylesUrl },
  ];
};

export default function Index() {
  const { data, currentUrl, showHistory, historyStart, historyEnd } =
    useLoaderData<ServerSideData>();
  const fetcher = useFetcher();

  const { startDate, endDate } = useMemo(() => {
    const referenceDate = new Date();
    return {
      startDate: parseDate(historyStart, referenceDate),
      endDate: parseDate(historyEnd, referenceDate),
    };
  }, [historyStart, historyEnd]);

  const toggleHistory = () => {
    if (!showHistory) {
      executeHistoryQuery(startDate, endDate);
    } else {
      fetcher.submit({ showHistory: "false" }, { method: "POST" });
    }
  };

  const executeHistoryQuery = (start: Date | null, end: Date | null) => {
    let searchParams = { showHistory: "true" };
    searchParams =
      start !== null
        ? Object.assign(searchParams, { start: format(start, DATETIME_FORMAT) })
        : searchParams;
    searchParams =
      end !== null
        ? Object.assign(searchParams, { end: format(end, DATETIME_FORMAT) })
        : searchParams;
    fetcher.submit(searchParams, { method: "POST" });
  };

  return (
    <div className="App">
      <Header
        historyOpen={showHistory || false}
        toggleHistory={toggleHistory}
        currentUrl={currentUrl}
      />
      <HistorySearchSection
        isOpen={showHistory || false}
        start={startDate}
        end={endDate}
        onSearchRangeChange={executeHistoryQuery}
      />
      <div className="Content">
        <EntitySection entity="koulutus" data={data.koulutukset} />
        <EntitySection entity="toteutus" data={data.toteutukset} />
        <EntitySection entity="hakukohde" data={data.hakukohteet} />
        <EntitySection entity="haku" data={data.haut} />
      </div>
    </div>
  );
}
