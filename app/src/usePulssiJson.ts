import { QueryClient, useQuery } from "react-query";
import { PulssiData } from "./commonTypes";


const REFETCH_INTERVAL = 1 * 10 * 1000;

export const usePulssiJson = () => {
  return useQuery<PulssiData>("getPulssiJson", () => fetch("/pulssi.json").then(response => response.json()), {
    refetchInterval: REFETCH_INTERVAL,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}