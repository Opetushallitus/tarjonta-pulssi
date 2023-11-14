import { type LoaderFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { format } from "date-fns";
import { useMemo } from "react";

import { HistorySearchSection } from "~/app/components/HistorySearchSection";
import { getHistoryAmountData } from "~/app/servers/amount.server";
import { parseDate } from "~/shared/amountDataUtils";
import { DATETIME_FORMAT_TZ } from "~/shared/constants";
import type { PulssiData } from "~/shared/types";

import { DataContent } from "../components/DataContent";

interface ServerSideData {
  data: PulssiData;
  historyStart?: string;
  historyEnd?: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const historyStart = url.searchParams.get("start");
  const historyEnd = url.searchParams.get("end");

  return {
    data: await getHistoryAmountData(historyStart, historyEnd),
    historyStart,
    historyEnd,
  };
};

export default function History() {
  const { data, historyStart, historyEnd } = useLoaderData<ServerSideData>();
  const [, setSearchParams] = useSearchParams();

  const { startDate, endDate } = useMemo(() => {
    const referenceDate = new Date();
    return {
      startDate: parseDate(historyStart, referenceDate),
      endDate: parseDate(historyEnd, referenceDate),
    };
  }, [historyStart, historyEnd]);

  const executeHistoryQuery = (start: Date | null, end: Date | null) => {
    setSearchParams((params) => {
      if (start) {
        params.set("start", format(start, DATETIME_FORMAT_TZ));
      }
      if (end) {
        params.set("end", format(end, DATETIME_FORMAT_TZ));
      }
      return params;
    });
  };

  return (
    <>
      <HistorySearchSection
        minDateTime={data.minAikaleima}
        start={startDate}
        end={endDate}
        onSearchRangeChange={executeHistoryQuery}
      />
      <DataContent data={data} showHistory={true} />
    </>
  );
}
