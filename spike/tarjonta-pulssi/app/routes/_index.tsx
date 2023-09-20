import { Box, Paper, Typography, styled } from "@mui/material";
import { EntityTable } from "~/components/EntityTable";
import { Header } from "~/components/Header";
import type { EntityType } from "../../../../cdk/shared/types";
import type { EntityDataWithSubKey } from "~/servers/types";
import { ICONS } from "~/constants";
import { type LoaderFunction, type ActionFunction, type LinksFunction, redirect } from "@remix-run/node";
import { getCurrentAmountDataFromDb, getAmountDataFromTestFile } from "~/servers/amount.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import mainStylesUrl from "~/styles/index.css";
import tableStylesUrl from "~/styles/table.css";
import { useTranslation } from "react-i18next";
import { CURRENT_DATE_TIME, HistorySearchSection, PULSSI_START_DATE_TIME } from "~/components/HistorySearchSection";
import { useState } from "react";
import { P, match } from "ts-pattern";

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
  data
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

export const loader: LoaderFunction = async ({request}) => {
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  return await getAmountDataFromTestFile(start !== null || end !== null);
};

const setSearchParameter = (paramName: string, formData: FormData, searchParameters: URLSearchParams) => {
  const paramValue = formData.get(paramName);
  if (paramValue) {
    searchParameters.set(paramName, paramValue.toString());
  }
}

export const action: ActionFunction = async ({request}) => {
  const formData = await request.formData()
  const url = new URL(request.url);
  const newUrl = new URL(url)
  const newSearchParams = new URLSearchParams(url.search);
  setSearchParameter("lng", formData, newSearchParams);
  setSearchParameter("start", formData, newSearchParams);
  setSearchParameter("end", formData, newSearchParams);
  if (formData.has("showCurrent")) {
    newSearchParams.delete("start");
    newSearchParams.delete("end");
  }
  newUrl.search = newSearchParams.toString();
  return redirect(newUrl.toString());
}

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: mainStylesUrl }, { rel: "stylesheet", href: tableStylesUrl }];
};

export default function Index() {
  const {koulutukset, toteutukset, hakukohteet, haut} = useLoaderData();
  const [historyOpen, showHistory] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const fetcher = useFetcher();

  const toggleHistory = () => {
    showHistory(!historyOpen);
    if (!historyOpen) {
      executeHistoryQuery(startDate, endDate);
    } else {
      fetcher.submit({showCurrent: "true"}, {method: "POST"});
    }
  };

  const executeHistoryQuery = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);

    const searchParams = match([start, end])
      .with([P.not(null), P.not(null)], ([startVal, endVal]) => 
        ({ start: startVal.toISOString(), end: endVal.toISOString()}))
      .with([P.not(null), null], ([startVal, _]) => 
        ({start: startVal.toISOString(), end: "undefined"}))
      .with([null, P.not(null)], ([_, endVal]) => 
        ({start: "undefined", end: endVal.toISOString()}))
      .otherwise(() => 
        ({start: "undefined", end: "undefined"}));
    
    fetcher.submit( searchParams, {method: "POST"});
  }

  return <div className="App">
      <Header historyOpen={historyOpen} toggleHistory={toggleHistory}/>
      <HistorySearchSection isOpen={historyOpen} start={startDate} end={endDate} onSearchRangeChange={executeHistoryQuery}/>
      <div className="Content">
        <EntitySection entity="koulutus" data={koulutukset} />
        <EntitySection entity="toteutus" data={toteutukset} />
        <EntitySection entity="hakukohde" data={hakukohteet} />
        <EntitySection entity="haku" data={haut} />
      </div>
    </div>;
}