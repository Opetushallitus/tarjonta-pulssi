import { EntityType, WithAmounts } from './commonTypes';
import {ReactComponent as ArrowRightOutlinedIcon} from '@material-design-icons/svg/outlined/arrow_right.svg';
import { useTranslations } from './useTranslations';

type RowProps = {
  title: string; amounts: WithAmounts; subRows?: any, indent?: boolean
}

const ContentRow = ({title, amounts, subRows = [], indent = false}: RowProps) => {

  return <>
  <tr key={title}>
    <th className="col">
      <div style={{display: 'flex', alignItems: 'center'}}>
        {indent && <ArrowRightOutlinedIcon style={{height: 15}} />}
        <div style={{textAlign: 'left'}}>{title}</div>
      </div>
    </th>
    <td className="content">{amounts?.julkaistu_amount}</td>
    <td className="content">{
      (amounts.julkaistu_amount) + (amounts.arkistoitu_amount)}
    </td>
  </tr>
  {subRows && subRows.map((rowProps:any) => <ContentRow {...rowProps} indent={true} />)}
</>
}

const SubEntry = ({entry}: any) => {
  const [k, v] = entry;
  const subEntries = Object.entries(v).filter(ss => !ss?.[0]?.endsWith('_amount'))
  const {t} = useTranslations();

  return <ContentRow title={t(k) || k} amounts={v} subRows={subEntries.map(([k, v]) => ({ title: t(k) || k, amounts: v}))} />
}

export const EntityTable = ({data, entity}: {data: any, entity: EntityType}) => {
    const childrenObj = entity === "haku" ? data.by_hakutapa : data.by_tyyppi;
    const {t} = useTranslations()

    return <table>
        <thead>
          <tr>
            <th className="row col">{entity === "haku" ? t("hakutapa_otsikko") : t("tyyppi_otsikko")}</th>
            <th className="row">{t("julkaistut_otsikko")}</th>
            <th className="row" style={{maxWidth: "100px"}}>{t("molemmat_tilat_otsikko")}</th>
          </tr>
        </thead>
        <tbody>
        {Object.entries(childrenObj).map((subEntry: any) => <SubEntry entry={subEntry} />)}
      </tbody>
      <tfoot><ContentRow title={t("yhteensa_otsikko")} amounts={data?.by_tila} /></tfoot>
    </table>
}