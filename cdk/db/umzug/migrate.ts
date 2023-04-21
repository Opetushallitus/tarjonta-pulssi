/* eslint @typescript-eslint/no-var-requires: off */
const { Client } = require("pg");
const { createMigrator } = require("./umzug.ts");

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
