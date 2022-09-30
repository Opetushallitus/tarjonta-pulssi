import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import React, { useState } from 'react';
import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import { EntityType, WithAmounts } from './commonTypes';

const ExpandIcon = ({isExpanded}: {isExpanded: boolean}) => isExpanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />

type RowProps = {
  title: string; amounts: WithAmounts; subRows?: any, indent?: boolean
}

const ContentRow = React.memo(({title, amounts, subRows = [], indent = false}: RowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return <>
  <TableRow key={title}>
    <TableCell sx={{ cursor: subRows?.length ? 'pointer' : 'inherit'}} onClick={() => {setIsExpanded(s => !s)}} component="th" scope="row">
      <Box display="flex" alignItems="center">
        {indent && <Typography>-&nbsp;</Typography>}
        <Typography component="span">{title}</Typography>
        {subRows && subRows?.length > 0 && <ExpandIcon isExpanded={isExpanded} />}
      </Box>
    </TableCell>
    <TableCell align="right">{amounts?.julkaistu_amount}</TableCell>
    <TableCell align="right">{
      (amounts.julkaistu_amount) + (amounts.arkistoitu_amount)}
    </TableCell>
  </TableRow>
  {subRows && isExpanded && subRows.map((rowProps:any) => <ContentRow {...rowProps} indent={true} />)}
</>
})

const SubEntry = ({entry}: any) => {
  const [k, v] = entry;
  const subEntries = Object.entries(v).filter(ss => !ss?.[0]?.endsWith('_amount'))

  return <ContentRow title={k} amounts={v} subRows={subEntries.map(([k, v]) => ({ title: k, amounts: v}))} />
}

export const EntityTable = ({data, entity}: {data: any, entity: EntityType}) => {
    const childrenObj = entity === "haku" ? data.by_hakutapa : data.by_tyyppi;

    return <Table>
        <TableHead>
          <TableRow>
            <TableCell component="th" scope="row">{entity === "haku" ? "hakutapa" : "tyyppi"}</TableCell>
            <TableCell>Julkaistut</TableCell>
            <TableCell>Kokonaismäärä</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
        {Object.entries(childrenObj).map((subEntry: any) => <SubEntry entry={subEntry} />)}
        <ContentRow title="Yhteensä" amounts={data?.by_tila} />
      </TableBody>
    </Table>
}