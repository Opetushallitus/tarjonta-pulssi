import React, { useState } from 'react';
import { EntityType, WithAmounts } from './commonTypes';
import {ReactComponent as ExpandLessOutlinedIcon} from '@material-design-icons/svg/outlined/expand_less.svg'
import {ReactComponent as ExpandMoreOutlinedIcon} from '@material-design-icons/svg/outlined/expand_more.svg';
import { useTranslations } from './useTranslations';

const ExpandIcon = ({isExpanded}: {isExpanded: boolean}) => isExpanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />

type RowProps = {
  title: string; amounts: WithAmounts; subRows?: any, indent?: boolean
}

const ContentRow = React.memo(({title, amounts, subRows = [], indent = false}: RowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return <>
  <tr key={title}>
    <th style={{ cursor: subRows?.length ? 'pointer' : 'inherit'}} className="col" onClick={() => {setIsExpanded(s => !s)}}>
      <div style={{display: 'flex', alignItems: 'center'}}>
        {indent && <div>-&nbsp;</div>}
        <div style={{textAlign: 'left'}}>{title}</div>
        {subRows && subRows?.length > 0 && <ExpandIcon isExpanded={isExpanded} />}
      </div>
    </th>
    <td className="content">{amounts?.julkaistu_amount}</td>
    <td className="content">{
      (amounts.julkaistu_amount) + (amounts.arkistoitu_amount)}
    </td>
  </tr>
  {subRows && isExpanded && subRows.map((rowProps:any) => <ContentRow {...rowProps} indent={true} />)}
</>
})

const SubEntry = ({entry}: any) => {
  const [k, v] = entry;
  const subEntries = Object.entries(v).filter(ss => !ss?.[0]?.endsWith('_amount'))
  const t = useTranslations()

  return <ContentRow title={t?.[k] || k} amounts={v} subRows={subEntries.map(([k, v]) => ({ title: k, amounts: v}))} />
}

export const EntityTable = ({data, entity}: {data: any, entity: EntityType}) => {
    const childrenObj = entity === "haku" ? data.by_hakutapa : data.by_tyyppi;
    const t = useTranslations()

    return <table>
        <thead>
          <tr>
            <th className="row col">{entity === "haku" ? t?.hakutapa_otsikko : t?.tyyppi_otsikko}</th>
            <th className="row">{t?.julkaistut_otsikko}</th>
            <th className="row">{t?.molemmat_tilat_otsikko}</th>
          </tr>
        </thead>
        <tbody>
        {Object.entries(childrenObj).map((subEntry: any) => <SubEntry entry={subEntry} />)}
      </tbody>
      <tfoot><ContentRow title={t?.yhteensa_otsikko} amounts={data?.by_tila} /></tfoot>
    </table>
}