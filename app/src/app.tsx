import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { useState } from 'react';
import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';

export const entityTypes = [
  "koulutus",
  "toteutus",
  "hakukohde",
  "haku",
] as const;
export type EntityType = typeof entityTypes[number];

export type Julkaisutila = "julkaistu" | "arkistoitu";

type WithAmounts = {
  julkaistu_amount: number;
  arkistoitu_amount: number;
}


export type KeyValueDataWithAmount = {
  [key in string]?: KeyValueDataWithAmount;
} & WithAmounts;

export type EntitySubKey = "by_tyyppi" | "by_hakutapa";

export type EntityDataWithSubKey<K extends EntitySubKey = EntitySubKey> = {
  by_tila: {
    [key in Julkaisutila]?: {
      _amount: number;
    };
  };
} & {
  [k in K]: KeyValueDataWithAmount;
}

type AmountsProps = {
    title?: string;
    data: any;
    root?: KeyValueDataWithAmount;
}

export type PulssiData = {
  koulutukset: EntityDataWithSubKey<"by_tyyppi">;
  toteutukset: EntityDataWithSubKey<"by_tyyppi">;
  hakukohteet: EntityDataWithSubKey<"by_tyyppi">;
  haut: EntityDataWithSubKey<"by_hakutapa">;
};

const outerBoxStyles = {
    display: "flex",
    flexDirection: "column"
}

const innerBoxStyles = {
    display: 'flex',
}

const Amounts = ({title, data, root = data}: AmountsProps) => {
    const entries = Object.entries(data)
    return <div style={outerBoxStyles}>
        {title &&<p>{title} ({data._amount})</p>}
        <div style={{...innerBoxStyles, flexDirection: entries.length < 4 ? 'row' : 'column'}}>
            {entries.map((arr) => {
                const [key, val] = arr;
                return val && key?.[0] !== '_' &&
                    <Amounts title={key} data={val as KeyValueDataWithAmount} root={root}/>
            })}
        </div>
    </div>
}

const ExpandIcon = ({isExpanded}: {isExpanded: boolean}) => isExpanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />

type RowProps = {
  title: string;
  amounts: WithAmounts
}

const ContentRow = ({title, amounts, subRows = [], indent = false}: {title: string; amounts: WithAmounts; subRows?: any, indent?: boolean}) => {
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
}

const SubEntry = ({entry}: any) => {
  const [k, v] = entry;
  const subEntries = Object.entries(v).filter(ss => !ss?.[0]?.endsWith('_amount'))

  return <ContentRow title={k} amounts={v} subRows={subEntries.map(([k, v]) => ({ title: k, amounts: v}))} />
}

const EntityTable = ({data, entity}: {data: any, entity: EntityType}) => {
    const childrenObj = entity === "haku" ? data.by_hakutapa : data.by_tyyppi;

    return <TableContainer component={Paper}>
      <Table>
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
    </TableContainer>
}

const queryClient = new QueryClient()

const REFETCH_INTERVAL = 5 * 60 * 1000;

const usePulssiData = () => {
  return useQuery<PulssiData>("getPulssiData", () => fetch("/pulssi.json").then(response => response.json()), {
    refetchInterval: REFETCH_INTERVAL,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function AppContent () {
  const {data, status} = usePulssiData();

  switch (status) {
    case "error": 
      return <div>Error loading data!</div>
    case "success": 
      return <div class="kouta">
        <h1>Koulutukset</h1>
        <EntityTable data={data?.koulutukset} entity="koulutus"/>
        <h1>Toteutukset</h1>
        <EntityTable data={data?.toteutukset} entity="toteutus"/>
        <h1>Hakukohteet</h1>
        <EntityTable data={data?.hakukohteet} entity="hakukohde"/>
        <h1>Haut</h1>
        <EntityTable data={data?.haut} entity="haku"/>
    </div>
    default:
      return <div></div>
  }
}

export function App() {
  return <QueryClientProvider client={queryClient}><AppContent /></QueryClientProvider>
}
