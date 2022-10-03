/* eslint @typescript-eslint/no-var-requires: off */
require('ts-node/register');
const { Client } = require('pg');
const { createMigrator } = require('./umzug')

const client = new Client({
    host: "localhost",
    port: 5432,
    database: "tarjontapulssi",
    user: "DUMMY",
    password: "DUMMY"
})

client.connect().then(() => {
    const migrator = createMigrator(client)
    return migrator.runAsCLI();
}).finally(() => {
    client.end()
})
