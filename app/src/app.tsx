import { usePulssiJson } from './usePulssiJson';
import { EntityTable } from './EntityTable';

export function App () {
  const {data, status} = usePulssiJson();

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

