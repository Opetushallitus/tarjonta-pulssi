/* eslint @typescript-eslint/no-var-requires: off */
import { Pool } from "pg";
import { DEFAULT_DB_POOL_PARAMS } from "./dbUtils";
import { saveAmountsFromElasticToDb } from "./pulssiUpdaterUtils";
import {
  Client as ElasticSearchClient,
} from "@elastic/elasticsearch";
import type { Client as IElasticSearchClient } from "@elastic/elasticsearch/api/new";

const pulssiDbPool = new Pool({
  ...DEFAULT_DB_POOL_PARAMS,
  host: "localhost",
  port: 5432,
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

// @ts-expect-error @elastic/elasticsearch
const elasticClient: IElasticSearchClient = new ElasticSearchClient({
  node: "http://localhost:9200",
});

pulssiDbPool.connect((err, dbClient, release) => {
  if (err) {
    return console.error("Error acquiring database client", err.stack)
  }
  saveAmountsFromElasticToDb(elasticClient, dbClient).then(() => {
    console.log("Pulssi results saved to database");
    release();
    pulssiDbPool.end();
  }).catch((err) => {
    console.error("Failed to save results to database", err.stack)
    release();
    pulssiDbPool.end();
  })
});
