import { useMemo } from "react";
import { EntityDataWithSubKey, EntityType, SubKeyWithAmounts, WithAmounts } from "./commonTypes";
import ArrowRightIcon from '@mui/icons-material/ArrowRightOutlined'
import { useTranslations } from "./useTranslations";
import { Box } from "@mui/material";

type SubRowProps = {
  titleKey: string;
  amounts: WithAmounts;
};

type RowProps = {
  titleKey: string;
  amounts: WithAmounts;
  subRows?: Array<SubRowProps>;
  indent?: boolean;
};

const ContentRow = ({
  titleKey,
  amounts,
  subRows = [],
  indent = false
}: RowProps) => {
  const { t } = useTranslations();

  const julkaistuAmount = Number(amounts?.julkaistu_amount);
  const totalAmount = Number(amounts?.arkistoitu_amount) + Number(amounts?.julkaistu_amount);

  return (
    <>
      <tr key={titleKey}>
        <th className="col">
          <div style={{ display: "flex", alignItems: "center" }}>
            {indent && <ArrowRightIcon style={{ height: "15px" }} />}
            <div style={{ textAlign: "left" }}>{t(titleKey) || titleKey}</div>
          </div>
        </th>
        <td className="content">
          {Number.isNaN(julkaistuAmount) ? "?" : julkaistuAmount}
        </td>
        <td className="content">
          {Number.isNaN(totalAmount) ? "?" : totalAmount}
        </td>
      </tr>
      {subRows &&
        subRows.map((rowProps) => (
          <ContentRow key={rowProps.titleKey} {...rowProps} indent={true} />
        ))}
    </>
  );
};

type Entry = [string, SubKeyWithAmounts];

const sortEntries = (entries: Array<Entry>) =>
  entries.sort((row1, row2) => {
    if (row1[0].toLowerCase()?.includes("muu ")) {
      return 1;
    }
    return row1[0] > row2[0] ? 1 : -1;
  });

const useDataRows = (v: SubKeyWithAmounts) => {
  return useMemo(() => {
    const subEntries = Object.entries(v).filter(
      (ss) => !ss?.[0]?.endsWith("_amount")
    ) as Array<Entry>;
    return (sortEntries(subEntries).map(([k, v]) => ({ titleKey: k, amounts: v })));
  }, [v]);
};

const EntryRow = ({ entry }: {entry: Entry}) => {
  const [k, v] = entry;
  const subRows = useDataRows(v);

  return <ContentRow titleKey={k} amounts={v} subRows={subRows} />;
};

export const EntityTable = ({
  data,
  entity
}: {
  data: EntityDataWithSubKey;
  entity: EntityType;
}) => {
  const childEntries = Object.entries(entity === "haku" ? data.by_hakutapa : data.by_tyyppi) as Array<Entry>;
  const { t } = useTranslations();

  return (
    <>
      <Box m={2}>
        <table>
          <thead>
            <tr>
              <th className="row col">
                {entity === "haku"
                  ? t("hakutapa_otsikko")
                  : t("tyyppi_otsikko")}
              </th>
              <th className="row">{t("julkaistut_otsikko")}</th>
              <th className="row" style={{ maxWidth: "100px" }}>
                {t("molemmat_tilat_otsikko")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortEntries(childEntries).map((entry) => (
              <EntryRow key={entry[0]} entry={entry} />
            ))}
          </tbody>
          <tfoot>
            <ContentRow titleKey="yhteensa_otsikko" amounts={data?.by_tila} />
          </tfoot>
        </table>
      </Box>
      {entity === "toteutus" && (
        <Box sx={{ borderTop: "1px solid rgba(0, 0, 0, 0.15)" }}>
          <Box m={2}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th className="row col"></th>
                  <th className="row">{t("julkaistut_otsikko")}</th>
                  <th className="row" style={{ maxWidth: "100px" }}>
                    {t("molemmat_tilat_otsikko")}
                  </th>
                </tr>
              </thead>
              <ContentRow
                titleKey="jotpa_otsikko"
                amounts={{
                  julkaistu_amount: data?.by_tila?.julkaistu_jotpa_amount,
                  arkistoitu_amount: data?.by_tila?.arkistoitu_jotpa_amount
                }}
              />
            </table>
          </Box>
        </Box>
      )}
    </>
  );
};
