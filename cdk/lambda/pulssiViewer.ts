import { Handler } from "aws-lambda";
import { DEFAULT_DB_POOL_PARAMS, getSSMParam } from "./shared";
import type { EntityType } from "./shared";
import render from "preact-render-to-string";
import { h } from "preact";
import App from "./app";

import type { Julkaisutila } from "./shared";
import { Pool } from "pg";

const template = `<!DOCTYPE html>
<html>
<head>
    <title>Tarjonta-pulssi</title>
</head>
<body>
    {{body}}
</body>
<script>
    let UPDATE_INTERVAL = 60 * 1000;
    let timeoutId = null;
    function loadContent(delay = UPDATE_INTERVAL) {
        timeoutId = setTimeout(
            () =>
                fetch(window.location.href)
                    .then(response => response.text())
                    .then(text => {
                        document.body.innerHTML = text
                        loadContent();
                    })
                    .catch((err) => {
                        console.log(err)
                    }),
            delay
        )
    }
    function onVisibilityChange() {
        if (document.hidden) {
            clearTimeout(timeoutId)
            timeoutId = null;
        } else if (!timeoutId) {
            loadContent(0)
        }
    }
    window.onload = () => {
        window.addEventListener('visibilitychange', onVisibilityChange)
        loadContent()
    }
</script>
</html>`;

const PULSSI_DB_USER = await getSSMParam(
  process.env.TARJONTAPULSSI_POSTGRES_RO_USER
);
const PULSSI_DB_PASSWORD = await getSSMParam(
  process.env.TARJONTAPULSSI_POSTGRES_RO_PASSWORD
)

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
  port: 5432,
  database: "tarjontapulssi",
  user: PULSSI_DB_USER,
  password: PULSSI_DB_PASSWORD,
})

const sumBy = (arr: Array<any>, getNum: (x: any) => number) => {
  return arr.reduce((result, value) => result + getNum(value), 0);
};

type DbRowBase = { tila: Julkaisutila; amount: number | string };

const getCounts = async (entity: EntityType) => {
  const res = await pulssiDbPool.query(`SELECT * from ${entity}_amounts`);
  const rows = res.rows;

  const countsByTila = rows.reduce(
    (result, row) => {
      const primaryColumn =
        row?.[entity === "haku" ? "hakutapa" : "tyyppi_path"];

      const tila = row.tila;
      const amount = Number(row.amount);

      if (entity === "haku") {
        result[tila][primaryColumn] = {
          _amount: amount,
        };
      } else {
        const ktParts = primaryColumn.split("/");
        let previousPartObj: Record<string, any> | null = null;
        ktParts.forEach((part: string) => {
          const target = previousPartObj ?? result[tila];

          if (!target[part]) {
            target[part] = {
              _amount: 0,
            };
          }
          target[part]._amount += amount;
          previousPartObj = result[tila][part];
        });
      }
      return result;
    },
    {
      julkaistu: {
        _amount: sumBy(rows, (row: DbRowBase) =>
          row.tila === "julkaistu" ? Number(row.amount) : 0
        ),
      },
      arkistoitu: {
        _amount: sumBy(rows, (row: DbRowBase) =>
          row.tila === "arkistoitu" ? Number(row.amount) : 0
        ),
      },
    }
  );

  return {
    _amount: sumBy(rows, (row) => Number(row.amount)),
    ...countsByTila,
  };
};

export const main: Handler = async (event, context /*callback*/) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const pulssiData = {
    koulutukset: await getCounts("koulutus"),
    toteutukset: await getCounts("toteutus"),
    hakukohteet: await getCounts("hakukohde"),
    haut: await getCounts("haku"),
  };

  return template.replace(
    "{{body}}",
    render(h(App, { data: pulssiData as any }), {}, { pretty: true })
  );
};
