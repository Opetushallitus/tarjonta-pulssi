import data_current from "~/shared/testdata/pulssi.json";
import data_with_history from "~/shared/testdata/pulssi_with_history.json";

export const getCurrentAmountDataFromLocalfile = async () => {
  return data_current;
};

export const getHistoryAmountDataFromLocalfile = async (
  _start: string | null,
  _end: string | null
) => {
  return { ...data_with_history, minAikaleima: "26.10.2022 00:00 +02" };
};
