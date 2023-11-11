const up = async ({ context: pg }) => {
  await pg.query(`
 ALTER TABLE toteutus_amounts ADD COLUMN IF NOT EXISTS taydennyskoulutus_amount bigint default 0; 
  `);
  await pg.query(`
 ALTER TABLE toteutus_amounts ADD COLUMN IF NOT EXISTS tyovoimakoulutus_amount bigint default 0; 
  `);
  await pg.query(`
 ALTER TABLE toteutus_amounts_history ADD COLUMN IF NOT EXISTS taydennyskoulutus_amount bigint default 0; 
   `);
  await pg.query(`
 ALTER TABLE toteutus_amounts_history ADD COLUMN IF NOT EXISTS tyovoimakoulutus_amount bigint default 0; 
   `);

  await pg.query(`
 create or replace function update_toteutus_amounts_history() returns trigger as
  $$
  begin
    insert into toteutus_amounts_history (
      tyyppi_path,
      jotpa_amount,
      taydennyskoulutus_amount,
      tyovoimakoulutus_amount,
      tila,
      amount,
      transaction_id,
      system_time
      ) values (
        old.tyyppi_path,
        old.jotpa_amount,
        old.taydennyskoulutus_amount,
        old.tyovoimakoulutus_amount,
        old.tila,
        old.amount,
        old.transaction_id,
        tstzrange(lower(old.system_time), now(), '[)')
      );
    return null;
  end;
  $$ language plpgsql; 
`);
};

module.exports = { up };
