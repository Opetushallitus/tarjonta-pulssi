import ArrowRightIcon from "@mui/icons-material/ArrowRightOutlined";
import { Box, styled, Typography } from "@mui/material";
import type { EntityType, EntityDataWithSubKey, WithAmounts } from "../../../shared/types";
import { useTranslation } from "react-i18next";
import { match, P } from "ts-pattern";
import { sumUp } from "../../../shared/amountDataUtils";

type SubRowProps = {
  subkey: string;
} & WithAmounts;

type RowProps = {
  titleKey: string;
  amounts: WithAmounts;
  subRows?: Array<SubRowProps>;
  indent?: boolean;
  formatAmounts: (curr: Number, old: Number) => string;
};

const totalAmount = (julkaistuAmount: number, arkistoituAmount: number) => {
  return match([julkaistuAmount, arkistoituAmount])
    .with([NaN, NaN], () => NaN)
    .with([P.number.gte(0), NaN], () => julkaistuAmount)
    .with([NaN, P.number.gte(0)], () => arkistoituAmount)
    .otherwise(() => julkaistuAmount + arkistoituAmount)

}

const formatSingleAmount = (amount: Number, _: Number = NaN) => Number.isNaN(amount) ? "?" : `${amount}`;
const formatHistoryAmounts = (currentAmount: Number, oldAmount: Number) => {
  const currValue = formatSingleAmount(currentAmount);
  const oldValue = formatSingleAmount(oldAmount);
  return currValue === oldValue ? currValue : `${oldValue}...${currValue}`;
}


const ContentRow = ({
  titleKey,
  amounts,
  subRows = [],
  indent = false,
  formatAmounts,
}: RowProps) => {
  const { t } = useTranslation();

  const julkaistuAmount = Number(amounts?.julkaistu_amount);
  const julkaistuAmountOld = Number(amounts?.julkaistu_amount_old);
  const totalAmount = Number(sumUp(amounts?.julkaistu_amount, amounts?.arkistoitu_amount));
  const totalAmountOld = Number(sumUp(amounts?.julkaistu_amount_old, amounts?.arkistoitu_amount_old));
  
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
          {formatAmounts(julkaistuAmount, julkaistuAmountOld)}
        </td>
        <td className="content">
          {formatAmounts(totalAmount, totalAmountOld)}
        </td>
      </tr>
      {subRows.map((rowProps) => (
        <ContentRow key={rowProps.subkey} titleKey={rowProps.subkey} amounts={rowProps} indent={true} formatAmounts={formatAmounts} />
      ))}
    </>
  ) : null;
};

const JoistaHeading = styled(Typography)`
  font-size: 19px;
  font-weight: 500;
`;

export const EntityTable = ({
  data,
  entity,
  showHistory,
}: {
  data: EntityDataWithSubKey;
  entity: EntityType;
  showHistory: boolean;
}) => {
  const { t } = useTranslation();

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
            {data?.items.map((entry) => (
              <ContentRow key={entry.subkey} titleKey={entry.subkey} amounts={entry} subRows={entry.items || []} formatAmounts={showHistory ? formatHistoryAmounts : formatSingleAmount}/>
            ))}
          </tbody>
          <tfoot>
            <ContentRow titleKey="yhteensa_otsikko" amounts={data?.by_tila} formatAmounts={showHistory ? formatHistoryAmounts : formatSingleAmount}/>
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
                    {t("molemmat_tilat_otsikko")}</th>
                </tr>
              </thead>
              <tbody>
                <ContentRow
                  titleKey="jotpa_otsikko"
                  amounts={{
                    julkaistu_amount: data?.by_tila?.julkaistu_jotpa_amount,
                    julkaistu_amount_old: data?.by_tila.julkaistu_jotpa_amount_old,
                    arkistoitu_amount: data?.by_tila?.arkistoitu_jotpa_amount,
                    arkistoitu_amount_old: data?.by_tila.arkistoitu_jotpa_amount_old
                  }}
                  formatAmounts={showHistory ? formatHistoryAmounts : formatSingleAmount}
                />
                <ContentRow
                  titleKey="taydennyskoulutus_otsikko"
                  amounts={{
                    julkaistu_amount: data?.by_tila?.julkaistu_taydennyskoulutus_amount,
                    julkaistu_amount_old: data?.by_tila?.julkaistu_taydennyskoulutus_amount_old,
                    arkistoitu_amount: data?.by_tila?.arkistoitu_taydennyskoulutus_amount,
                    arkistoitu_amount_old: data?.by_tila?.arkistoitu_taydennyskoulutus_amount_old
                  }}
                  formatAmounts={showHistory ? formatHistoryAmounts : formatSingleAmount}
                />
                <ContentRow
                  titleKey="tyovoimakoulutus_otsikko"
                  amounts={{
                    julkaistu_amount: data?.by_tila?.julkaistu_tyovoimakoulutus_amount,
                    julkaistu_amount_old: data?.by_tila?.julkaistu_tyovoimakoulutus_amount_old,
                    arkistoitu_amount: data?.by_tila?.arkistoitu_tyovoimakoulutus_amount,
                    arkistoitu_amount_old: data?.by_tila?.arkistoitu_tyovoimakoulutus_amount_old
                  }}
                  formatAmounts={showHistory ? formatHistoryAmounts : formatSingleAmount}
                />
              </tbody>
            </table>
          </Box>
        </Box>
      )}
    </>
  );
};
