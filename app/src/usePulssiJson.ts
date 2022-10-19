import { useQuery } from "react-query";
import { PULSSI_JSON_PATH } from "./constants";
import { PulssiData } from "../../cdk/shared/types";

const REFETCH_INTERVAL = 1 * 60 * 1000;

export const usePulssiJson = () => {
  return useQuery<PulssiData>(
    "getPulssiJson",
    () => fetch(PULSSI_JSON_PATH + "pulssi.json").then((response) => response.json()),
    {
      refetchInterval: REFETCH_INTERVAL,
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    }
  );
};
