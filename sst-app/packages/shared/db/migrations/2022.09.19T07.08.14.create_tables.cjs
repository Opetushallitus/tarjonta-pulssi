const historyTableInitSql = (name, fields) => {
  return `CREATE table ${name}_history (like ${name});
    create or replace function set_temporal_columns() returns trigger as
    $$
    begin
      new.system_time := tstzrange(now(), null, '[)');
      new.transaction_id := txid_current();
      return new;
    end;
    $$ language plpgsql;

    create trigger set_temporal_columns_on_${name}_on_insert
      before insert on ${name}
      for each row
    execute procedure set_temporal_columns();

    create trigger set_temporal_columns_on_${name}_on_update
      before update on ${name}
      for each row
    execute procedure set_temporal_columns();

    create or replace function update_${name}_history() returns trigger as
    $$
    begin
      insert into ${name}_history (
          ${fields.join(",\n")},
          transaction_id,
          system_time
          ) values (
            ${fields.map((f) => `old.${f}`).join(",\n")},
            old.transaction_id,
            tstzrange(lower(old.system_time), now(), '[)')
          );
      return null;
    end;
    $$ language plpgsql;

    create trigger ${name}_history
      after update on ${name}
      for each row
      when (old.transaction_id <> txid_current())
    execute procedure update_${name}_history();
    
    create trigger delete_${name}_history
      after delete on ${name}
      for each row
    execute procedure update_${name}_history();`;
};

const commonFields = `tila varchar NOT NULL,
amount bigint NOT NULL,
transaction_id bigint not null default txid_current(),
system_time tstzrange not null default tstzrange(now(), null, '[)'),`;

const up = async ({ context: pg }) => {
  await pg.query(`
CREATE TABLE koulutus_amounts (
    tyyppi_path varchar NOT NULL,
    ${commonFields}
    PRIMARY KEY (tyyppi_path, tila),
    CHECK (tila IN ('julkaistu', 'arkistoitu'))
);`);

  await pg.query(historyTableInitSql("koulutus_amounts", ["tyyppi_path", "tila", "amount"]));

  await pg.query(`
CREATE TABLE toteutus_amounts (
    tyyppi_path varchar NOT NULL,
    jotpa_amount bigint default 0,
    ${commonFields}
    PRIMARY KEY (tyyppi_path, tila),
    CHECK (tila IN ('julkaistu', 'arkistoitu'))
);`);

  await pg.query(historyTableInitSql("toteutus_amounts", ["tyyppi_path", "tila", "amount"]));

  await pg.query(`
CREATE TABLE hakukohde_amounts (
    tyyppi_path varchar NOT NULL,
    ${commonFields}
    PRIMARY KEY (tyyppi_path, tila),
    CHECK (tila IN ('julkaistu', 'arkistoitu'))
);
`);

  await pg.query(historyTableInitSql("hakukohde_amounts", ["tyyppi_path", "tila", "amount"]));

  await pg.query(`
CREATE TABLE haku_amounts (
    hakutapa varchar NOT NULL,
    ${commonFields}
    PRIMARY KEY (hakutapa, tila),
    CHECK (tila IN ('julkaistu', 'arkistoitu'))
);`);

  await pg.query(historyTableInitSql("haku_amounts", ["hakutapa", "tila", "amount"]));
};

const down = async ({ context: pg }) => {
  await pg.query(`
DROP TABLE koulutus_amounts, koulutus_amounts_history;
`);
  await pg.query(`
DROP TABLE toteutus_amounts, toteutus_amounts_history;
`);
  await pg.query(`
DROP TABLE hakukohde_amounts, hakukohde_amounts_history;
`);
  await pg.query(`
DROP TABLE haku_amounts, haku_amounts_history;
`);
};

module.exports = { up, down };
