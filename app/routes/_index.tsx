import { type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getCurrentAmountData } from "~/app/servers/amount.server";
import { PulssiData } from "~/shared/types";

import { DataContent } from "../components/DataContent";

interface ServerSideData {
  data: PulssiData;
}

export const loader: LoaderFunction = async () => {
  return { data: await getCurrentAmountData() };
};

export default function Index() {
  const { data } = useLoaderData<ServerSideData>();
  return <DataContent data={data} showHistory={false} />;
}
