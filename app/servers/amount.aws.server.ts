export const getCurrentAmountDataFromAws = async () => {
  const results = await fetch(process.env.DB_API_URL || "");
  const jsonResult = await results.json();
  return jsonResult;
};

export const getHistoryAmountDataFromAws = async (
  startStr: string | null,
  endStr: string | null
) => {
  let params = { history: "true " };
  params = startStr !== null ? Object.assign(params, { start: startStr }) : params;
  params = endStr !== null ? Object.assign(params, { end: endStr }) : params;
  const url = `${process.env.DB_API_URL || ""}?${new URLSearchParams(params).toString()}`;
  const results = await fetch(url);
  return await results.json();
};
