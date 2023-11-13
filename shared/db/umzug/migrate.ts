/* eslint @typescript-eslint/no-var-requires: off */
import pkg from "pg";

import { createMigrator } from "./umzug.ts";

const { Client } = pkg;
const client = new Client({
  host: "localhost",
  port: 5432,
  database: "tarjontapulssi",
  user: "oph",
  password: "oph",
});

client
  .connect()
  .then(() => {
    const migrator = createMigrator(client);
    return migrator.runAsCLI();
  })
  .finally(() => {
    client.end();
  });
