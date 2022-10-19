import { Umzug } from "umzug";
import fs from "fs";
import path from "path";
import { ClientBase } from "pg";

const MIGRATIONS_TABLE_NAME = "umzug_migrations";

const JS_MIGRATION_TEMPLATE = `const up = params => {};
const down = params => {};
module.exports = { up, down }`.trimStart();

export const createMigrator = (client: ClientBase, migrationsPath = "db/migrations") =>
  new Umzug({
    migrations: {
      glob: `${migrationsPath}/*.{js,up.sql}`,
      resolve(params) {
        return params.path?.endsWith(".sql")
          ? {
              name: params.name,
              path: params.path,
              up: () =>
                params.context.query(fs.readFileSync(params.path!).toString()),
              down: () =>
                params.context.query(
                  fs
                    .readFileSync(params.path!.replace(".up.sql", ".down.sql"))
                    .toString()
                )
            }
          : Umzug.defaultResolver(params);
      }
    },
    context: client,
    storage: {
      async executed({ context: client }) {
        await client.query(
          `create table if not exists ${MIGRATIONS_TABLE_NAME}(name text)`
        );
        const result = await client.query(
          `select name from ${MIGRATIONS_TABLE_NAME}`
        );
        return result.rows.map((r: { name: string }) => r.name);
      },
      async logMigration({ name, context: client }) {
        await client.query(
          `insert into ${MIGRATIONS_TABLE_NAME}(name) values ($1)`,
          [name]
        );
      },
      async unlogMigration({ name, context: client }) {
        await client.query(
          `delete from ${MIGRATIONS_TABLE_NAME} where name = $1`,
          [name]
        );
      }
    },
    logger: console,
    create: {
      folder: "db/migrations",
      template(filepath: string): Array<[string, string]> {
        const ext = path.extname(filepath);
        if (ext === ".js") {
          return [[filepath, JS_MIGRATION_TEMPLATE]];
        } else if (ext === ".sql") {
          return [
            [filepath.replace(".sql", ".up.sql"), "-- up"],
            [filepath.replace(".sql", ".down.sql"), "-- down"]
          ];
        } else {
          throw Error(`Invalid migration type ${ext}!`);
        }
      }
    }
  });

export type Migration = Umzug<ClientBase>;
