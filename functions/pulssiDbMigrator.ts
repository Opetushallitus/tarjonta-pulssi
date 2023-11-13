import { Handler } from "aws-lambda";

import { createMigrator } from "../shared/db/umzug/umzug.ts";
import { createPulssiDbPool } from "../shared/dbUtils.ts";

const pulssiDbPool = await createPulssiDbPool();

export const main: Handler = async (event, context) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to use pool

  const pulssiClient = await pulssiDbPool.connect();
  const migrator = createMigrator(pulssiClient, "/opt");

  try {
    await migrator.up();
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    pulssiClient.release(true);
  }
};
