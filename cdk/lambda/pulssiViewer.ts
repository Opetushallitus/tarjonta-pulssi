import { Handler } from "aws-lambda";
import { connectToDb, getSSMParam } from "./shared";
import type { EntityType } from "./shared";

const connectPulssiDb = async () => {
  const PULSSI_DB_USER = await getSSMParam(
    process.env.TARJONTAPULSSI_POSTGRES_RO_USER
  );
  const PULSSI_DB_PASSWORD = await getSSMParam(
    process.env.TARJONTAPULSSI_POSTGRES_RO_PASSWORD
  );

  return connectToDb({
    host: `tarjontapulssi.db.${process.env.PUBLICHOSTEDZONE}`,
    port: 5432,
    database: "tarjontapulssi",
    user: PULSSI_DB_USER,
    password: PULSSI_DB_PASSWORD,
  });
};

const pulssiClient = await connectPulssiDb();

type Julkaisutila = "julkaistu" | "arkistoitu";

const sumBy = (arr: Array<any>, getNum: (x: any) => number) => {
  return arr.reduce((result, value) => result + getNum(value), 0);
};

type DbRowBase = {tila: Julkaisutila; amount: number | string; }

const getCounts = async (entity: EntityType) => {
  const res = await pulssiClient.query(`SELECT * from ${entity}_amounts`);
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
        let previousPart: string | null = null;
        ktParts.forEach((part: string) => {
          if (previousPart) {
            result[tila][previousPart]._child = part;
          }
          if (!result[tila][part]) {
            result[tila][part] = {
              _amount: 0,
            };
          }
          result[tila][part]._parent = previousPart;
          result[tila][part]._amount += amount;
          previousPart = part;
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

  return {
    koulutukset: await getCounts("koulutus"),
    toteutukset: await getCounts("toteutus"),
    hakukohteet: await getCounts("hakukohde"),
    haut: await getCounts("haku"),
  };
};
