import { useLoaderData, type LoaderFunction } from "react-router";

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
