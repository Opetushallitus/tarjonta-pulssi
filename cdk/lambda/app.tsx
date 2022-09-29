import { PulssiData, KeyValueDataWithAmount, Julkaisutila, EntityDataWithSubKey, EntityType } from "./shared";

type AmountsProps = {
    title?: string;
    data: any;
    root?: KeyValueDataWithAmount;
}

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

const EntityTable = ({data, entity}: {data: any, entity: EntityType}) => {
    const childrenObj = entity === "haku" ? data.by_hakutapa : data.by_tyyppi;

    return <table>
        <tr><th>{entity === "haku" ? "hakutapa" : "tyyppi"}</th><th>Julkaistut</th><th>Kokonaismäärä</th></tr>

        {Object.entries(childrenObj).map((subEntry: any) => {
            const [k, v] = subEntry
            const subSub = Object.entries(v).filter(ss => !ss?.[0]?.endsWith('_amount'))
            return <><tr>
                <th>{k}</th>
                <td>{v?.julkaistu_amount ?? 0}</td>
                <td>{
                    (v.julkaistu_amount) + (v.arkistoitu_amount)}
                </td>
            </tr>
            {subSub.map(([k, v]: any) => <tr>
                <th>{k}</th>
                <td>{v?.julkaistu_amount ?? 0}</td>
                <td>{
                    (v.julkaistu_amount) + (v.arkistoitu_amount)}
                </td>
            </tr>)}
            </>
        })}
        <tr style={{borderTop: '1px solid black'}}><th>Yhteensä</th><td>{data?.by_tila?.julkaistu?._amount ?? 0}</td><td>{
            (data?.by_tila?.julkaistu?._amount ?? 0) + 
            (data?.by_tila?.arkistoitu?._amount ?? 0)}
        </td></tr>
    </table>

}

export default function App ({data}: {data: PulssiData}) {
    return <div class="kouta">
        <h1>Koulutukset</h1>
        <EntityTable data={data.koulutukset} entity="koulutus"/>
        <h1>Toteutukset</h1>
        <EntityTable data={data.toteutukset} entity="toteutus"/>
        <h1>Hakukohteet</h1>
        <EntityTable data={data.hakukohteet} entity="hakukohde"/>
        <h1>Haut</h1>
        <EntityTable data={data.haut} entity="haku"/>
    </div>
}