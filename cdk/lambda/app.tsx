type EntityData = {
    [key in string]?: EntityData;
} & {
    _amount: number;
};

type PulssiData = {
    koulutukset: EntityData;
    toteutukset: EntityData;
    hakukohteet: EntityData;
    haut: EntityData;
}
type AmountsProps = {
    title?: string;
    data: any;
    root?: EntityData;
}

const Amounts = ({title, data, root = data}: AmountsProps) => {
    return <details>
        {title &&<summary>{title} ({data._amount})</summary>}
        <div style={{paddingLeft: 30}}>
            {Object.entries(data).map((arr) => {
                const [key, val] = arr;
                return val && key?.[0] !== '_' &&
                    <Amounts title={key} data={val as EntityData} root={root}/>
            })}
        </div>
    </details>
}

export default function App ({data}: {data: PulssiData}) {
    return <div class="kouta">
        <Amounts data={data} />
    </div>
}