import { usePulssiJson } from './usePulssiJson';
import { EntityTable } from './EntityTable';
import {EntityType} from './commonTypes';
import './app.css'
import { ICONS } from './constants';

const translations: Record<EntityType, string> = {
  "koulutus": "Koulutukset",
  "toteutus": "Toteutukset",
  "hakukohde": "Hakukohteet",
  "haku": "Haut"
}

const EntitySection = ({entity, data}: {entity: EntityType, data: any}) => {

  const IconComponent = ICONS[entity];
  return <div className="EntitySection">
    <div className="EntitySectionHeader">
      <IconComponent className="icon"/>
      <div><h1>{translations[entity]}</h1></div>
    </div>
    <EntityTable data={data} entity={entity}/>
  </div>
}

export function App () {
  const {data, status} = usePulssiJson();

  switch (status) {
    case "error": 
      return <div>Error loading data!</div>
    case "success": 
      return <main>
          <EntitySection entity="koulutus" data={data?.koulutukset}/>
          <EntitySection entity="toteutus" data={data?.toteutukset}/>
          <EntitySection entity="hakukohde" data={data?.hakukohteet}/>
          <EntitySection entity="haku" data={data?.haut}/>
    </main>
    default:
      return <div></div>
  }
}

