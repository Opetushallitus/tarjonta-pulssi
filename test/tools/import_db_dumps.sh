#!/bin/sh

POSTGRES_CONTAINER=tarjontapulssi-database
DB_APP_DB=tarjontapulssi
DB_APP_USER=oph

docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/koulutus_amounts.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/toteutus_amounts.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/hakukohde_amounts.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/haku_amounts.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/koulutus_amounts_history.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/toteutus_amounts_history.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/hakukohde_amounts_history.sql
docker exec "${POSTGRES_CONTAINER}" psql "${DB_APP_DB}" --username "${DB_APP_USER}" -f /tmp/dbdump/haku_amounts_history.sql
