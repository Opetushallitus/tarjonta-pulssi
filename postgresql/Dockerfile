# Based on <https://hub.docker.com/_/postgres/>

FROM postgres:15.4

COPY ./configure-postgres.sh /docker-entrypoint-initdb.d/
COPY ./configure-tarjontapulssi-database.sh /docker-entrypoint-initdb.d/

COPY ./dbdump/ /tmp/dbdump
