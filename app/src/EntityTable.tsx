import { useMemo } from "react";
import ArrowRightIcon from "@mui/icons-material/ArrowRightOutlined";
import { useTranslations } from "./useTranslations";
import { Box, styled, Typography } from "@mui/material";
import {
  EntityDataWithSubKey,
  EntityType,
  SubKeyWithAmounts,
  WithAmounts
} from "../../cdk/shared/types";

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

type Entry = [string, SubKeyWithAmounts];

const ContentRow = ({
  titleKey,
  amounts,
  subRows = [],
  indent = false
}: RowProps) => {
  const { t } = useTranslations();

  const julkaistuAmount = Number(amounts?.julkaistu_amount);
  const totalAmount =
    Number(amounts?.arkistoitu_amount) + Number(amounts?.julkaistu_amount);
  const rowHasData = julkaistuAmount !== 0 || totalAmount !== 0;

  return rowHasData ? (
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
      {subRows.map((rowProps) => (
        <ContentRow key={rowProps.titleKey} {...rowProps} indent={true} />
      ))}
    </>
  ) : null;
};

const sortEntries = (entries: Array<Entry>) =>
  entries.sort((entry1, entry2) => (entry1[0] > entry2[0] ? 1 : -1));

const sortSubEntries = (entries: Array<Entry>) =>
  entries.sort((entry1, entry2) => {
    if (entry1[0].toLowerCase()?.includes("muu")) {
      return 1;
    }
    return entry1[0] > entry2[0] ? 1 : -1;
  });

const useDataRows = (v: SubKeyWithAmounts) => {
  return useMemo(() => {
    const subEntries = Object.entries(v).filter(
      (ss) => !ss?.[0]?.endsWith("_amount")
    ) as Array<Entry>;
    return sortSubEntries(subEntries).map(([k, v]) => ({
      titleKey: k,
      amounts: v
    }));
  }, [v]);
};

const EntryRow = ({ entry }: { entry: Entry }) => {
  const [k, v] = entry;
  const subRows = useDataRows(v);

  return <ContentRow titleKey={k} amounts={v} subRows={subRows} />;
};

const JoistaHeading = styled(Typography)`
  font-size: 19px;
  font-weight: 500;
`;

export const EntityTable = ({
  data,
  entity
}: {
  data: EntityDataWithSubKey;
  entity: EntityType;
}) => {
  const childEntries = Object.entries(
    data.by_hakutapa ? data.by_hakutapa : data.by_tyyppi
  );
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
        <Box>
          <Box
            sx={{
              p: 2,
              borderTop: "1px solid rgba(0, 0, 0, 0.15)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.15)"
            }}
          >
            <JoistaHeading variant="h3">{t("joista_otsikko")}</JoistaHeading>
          </Box>
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
