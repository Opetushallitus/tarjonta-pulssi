import { usePulssiJson } from './usePulssiJson';
import { EntityTable } from './EntityTable';
import {EntityType} from './commonTypes';
import { ICONS } from './constants';
import { useTranslations } from './useTranslations';
import { Header } from './Header';
import { CircularProgress, Paper } from '@mui/material';
import './app.css'

const EntitySection = ({entity, data}: {entity: EntityType, data: any}) => {

  const {t} = useTranslations()

  const IconComponent = ICONS[entity];
  return <Paper className="EntitySection">
    <div className="EntitySectionHeader">
      <IconComponent className="icon"/>
      <div><h1>{t(`${entity}_otsikko`) ?? entity}</h1></div>
    </div>
    <EntityTable data={data} entity={entity}/>
  </Paper>
}

const useTitle = (title: string) => {
  if (title && title !== document.title) {
    document.title = title;
  }
}

export function App () {
  const {data, status} = usePulssiJson();

  const {t} = useTranslations();
  useTitle(t("sivu_otsikko"));

  switch (status) {
    case "error": 
      return <div>Error loading data!</div>
    case "loading":
      return <CircularProgress />
    case "success": 
      return <><Header /><main>
          <EntitySection entity="koulutus" data={data?.koulutukset}/>
          <EntitySection entity="toteutus" data={data?.toteutukset}/>
          <EntitySection entity="hakukohde" data={data?.hakukohteet}/>
          <EntitySection entity="haku" data={data?.haut}/>
    </main></>
    default:
      return <div></div>
  }
}

