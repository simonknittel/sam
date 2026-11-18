-- The role `sam_statistics_grafana` reads the views of the schema
-- `statistics`, for example as the login of a Grafana data source. Each
-- viewer of a dashboard can send any SQL with the role, thus it gets only the
-- rights and the limits of this file.
--
-- Assumptions:
-- 1. The schema `statistics` exists (the migration `statistics_views` or the
--    infrastructure makes it).
-- 2. The role that owns the views runs this file: the role that applies the
--    migrations. The default privileges then also give SELECT on each view
--    that a later migration makes. To make and change the role, the role
--    that runs the file also needs SUPERUSER, or CREATEROLE.
--
-- The file runs again without an error. It sets no password: each
-- environment sets its own password with ALTER ROLE ... PASSWORD.
--
-- The role gets no right on the schema `public`. PostgreSQL gives PUBLIC
-- (thus each role) USAGE on the schema `public`, but no right on its tables.
-- The role can thus see the names of the tables, but it cannot read a table.
-- Do not revoke the USAGE from PUBLIC, because other roles can need it.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sam_statistics_grafana') THEN
        CREATE ROLE sam_statistics_grafana LOGIN;
    END IF;
END
$$;

-- A dashboard sends one query for each panel at the same time. 10
-- connections are sufficient for some viewers at the same time, and they
-- keep the load on the database server low. Set the maximum number of open
-- connections of the data source to 10 or less, so that the data source
-- waits for a free connection instead of an error.
ALTER ROLE sam_statistics_grafana WITH LOGIN CONNECTION LIMIT 10;

-- A session can change the two settings below with SET. They stop the
-- mistakes of a normal query. The rights at the end of this file are the real
-- limit.

-- A query of a view takes some milliseconds. 5 seconds give a large margin,
-- and they stop a heavy query of a viewer soon.
ALTER ROLE sam_statistics_grafana SET statement_timeout = '5s';

-- The role has no write right. Read-only transactions are a second limit.
ALTER ROLE sam_statistics_grafana SET default_transaction_read_only = on;

-- An open transaction holds a lock on each view that it read, and the lock
-- blocks a migration that changes the view. A query of a dashboard needs no
-- open transaction, thus 10 seconds are sufficient.
ALTER ROLE sam_statistics_grafana SET idle_in_transaction_session_timeout = '10s';

GRANT USAGE ON SCHEMA statistics TO sam_statistics_grafana;
GRANT SELECT ON ALL TABLES IN SCHEMA statistics TO sam_statistics_grafana;
ALTER DEFAULT PRIVILEGES IN SCHEMA statistics GRANT SELECT ON TABLES TO sam_statistics_grafana;
