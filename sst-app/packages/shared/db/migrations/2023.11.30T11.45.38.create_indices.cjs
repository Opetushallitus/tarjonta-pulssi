const up = async ({ context: pg }) => {
  await pg.query(`
  CREATE INDEX IF NOT EXISTS koulutus_amounts_history_search_idx ON koulutus_amounts_history (tyyppi_path, tila, upper(system_time)); 
  `);
  await pg.query(`
  CREATE INDEX IF NOT EXISTS toteutus_amounts_history_search_idx ON toteutus_amounts_history (tyyppi_path, tila, upper(system_time)); 
  `);
  await pg.query(`
  CREATE INDEX IF NOT EXISTS hakukohde_amounts_history_search_idx ON hakukohde_amounts_history (tyyppi_path, tila, upper(system_time));
   `);
  await pg.query(`
  CREATE INDEX IF NOT EXISTS haku_amounts_history_search_idx ON haku_amounts_history (hakutapa, tila, upper(system_time)); 
   `);
}; 

module.exports = { up }