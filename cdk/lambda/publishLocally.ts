import { Pool } from "pg";
import { DEFAULT_DB_POOL_PARAMS } from "./dbUtils";
import { getPulssiData } from "./pulssiPublisherUtils";

import jetpack from "fs-jetpack";


const pulssiDbPool = new Pool({
    ...DEFAULT_DB_POOL_PARAMS,
    host: "localhost",
    port: 5432,
    database: "tarjontapulssi",
    user: "oph",
    password: "oph",
  });

getPulssiData(pulssiDbPool).then((pulssiData) => {
    console.log("Writing data to test/resources/pulssi.json");
    jetpack.write("test/resources/pulssi.json", JSON.stringify(pulssiData));
    pulssiDbPool.end();
    console.log("Done");
  },
  (err) => {
    console.log("Failed to read data for publish; ");
    console.log(err);
    pulssiDbPool.end();
  });
