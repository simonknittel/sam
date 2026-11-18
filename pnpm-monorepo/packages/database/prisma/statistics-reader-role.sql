-- The role `sam_statistics_grafana` reads the views of the schema
-- `statistics`, for example as the login of a Grafana data source. Each
-- viewer of a dashboard can send any SQL with the role, thus it gets only the
-- rights and the limits of this file.
--
-- Assumptions:
-- 1. A superuser runs this file in the database of the app. The setting
--    temp_file_limit and the rights on functions of the schema pg_catalog
--    need SUPERUSER. CREATEROLE is not sufficient.
-- 2. The schema `statistics` exists (the migration `statistics_views` or the
--    infrastructure makes it). Its owner is the role of the app: the role
--    that applies the migrations (thus it owns the views) and that uses the
--    advisory locks. The file reads this role from the database.
--
-- The file runs again without an error. It sets no password: each
-- environment sets its own password with ALTER ROLE ... PASSWORD.
--
-- What stops a viewer:
-- - The rights: SELECT on the views of `statistics`, and no right on a table
--   of the schema `public`. PostgreSQL gives PUBLIC (thus each role) USAGE on
--   the schema `public`, thus the role can see the names of the tables, but
--   it cannot read a table. Do not revoke this USAGE from PUBLIC, because
--   other roles can need it.
-- - The rights that PostgreSQL gives to PUBLIC and that this file removes:
--   the advisory locks (a viewer could block the app and the migrations),
--   the large objects and the temporary tables (a viewer could write data).
--   The owner of `statistics` gets them back. Each other role that needs one
--   of them needs its own GRANT. A dump keeps these rights only when its
--   restore applies the privileges: run this file again after a restore.
-- - temp_file_limit and the connection limit: a viewer cannot change them.
-- - statement_timeout, default_transaction_read_only and
--   idle_in_transaction_session_timeout: a session can change them with SET,
--   thus they stop only the mistakes of a normal query. The data source
--   closes each connection after some time, which ends such a change.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sam_statistics_grafana') THEN
        CREATE ROLE sam_statistics_grafana LOGIN;
    END IF;
END
$$;

-- A database from before PostgreSQL 15 gives PUBLIC the right CREATE on the
-- schema `public`. With this right, a viewer can make tables and functions.
-- This file does not revoke the right, because the role of the app can need
-- it.
DO $$
BEGIN
    IF has_schema_privilege('sam_statistics_grafana', 'public', 'CREATE') THEN
        RAISE EXCEPTION 'The role sam_statistics_grafana has the right CREATE on the schema public (through PUBLIC, or through a GRANT to the role).'
            USING HINT = 'Make sure that the role of the app owns the schema public or has its own CREATE right on it. Then run REVOKE CREATE ON SCHEMA public FROM PUBLIC (and from sam_statistics_grafana), and run this file again.';
    END IF;
END
$$;

-- A dashboard sends one query for each panel at the same time. 10
-- connections are sufficient for some viewers at the same time, and they
-- keep the load on the database server low. Set the maximum number of open
-- connections of the data source to 10 or less, so that the data source
-- waits for a free connection instead of an error.
ALTER ROLE sam_statistics_grafana WITH LOGIN CONNECTION LIMIT 10;

-- A query of a view takes some milliseconds. 5 seconds give a large margin,
-- and they stop a heavy query of a viewer soon.
ALTER ROLE sam_statistics_grafana SET statement_timeout = '5s';

-- The role has no write right. Read-only transactions are a second limit.
ALTER ROLE sam_statistics_grafana SET default_transaction_read_only = on;

-- An open transaction holds a lock on each view that it read, and the lock
-- blocks a migration that changes the view. A query of a dashboard needs no
-- open transaction, thus 10 seconds are sufficient.
ALTER ROLE sam_statistics_grafana SET idle_in_transaction_session_timeout = '10s';

-- A hard limit for the temporary files of a session (a normal role cannot
-- change this setting). A query of a view needs no temporary file. The limit
-- stops a viewer who fills the disk with a large sort, also after
-- SET statement_timeout = 0.
ALTER ROLE sam_statistics_grafana SET temp_file_limit = '100MB';

GRANT USAGE ON SCHEMA statistics TO sam_statistics_grafana;
GRANT SELECT ON ALL TABLES IN SCHEMA statistics TO sam_statistics_grafana;

-- The role of the app, which owns the schema `statistics`:
-- 1. Its default privileges give SELECT on each view that a later migration
--    makes.
-- 2. It gets the rights that the statements below revoke from PUBLIC. The
--    GRANTs come first, thus the app keeps each right at each moment. A
--    superuser (locally `postgres`) needs no GRANT.
DO $$
DECLARE
    owner_name name;
    owner_is_superuser boolean;
BEGIN
    SELECT pg_roles.rolname, pg_roles.rolsuper
    INTO STRICT owner_name, owner_is_superuser
    FROM pg_catalog.pg_namespace
    JOIN pg_catalog.pg_roles ON pg_roles.oid = pg_namespace.nspowner
    WHERE pg_namespace.nspname = 'statistics';

    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA statistics GRANT SELECT ON TABLES TO sam_statistics_grafana',
        owner_name
    );

    IF NOT owner_is_superuser THEN
        EXECUTE format(
            'GRANT EXECUTE ON FUNCTION
                pg_catalog.pg_advisory_lock(bigint),
                pg_catalog.pg_advisory_lock(integer, integer),
                pg_catalog.pg_advisory_lock_shared(bigint),
                pg_catalog.pg_advisory_lock_shared(integer, integer),
                pg_catalog.pg_advisory_unlock(bigint),
                pg_catalog.pg_advisory_unlock(integer, integer),
                pg_catalog.pg_advisory_unlock_shared(bigint),
                pg_catalog.pg_advisory_unlock_shared(integer, integer),
                pg_catalog.pg_advisory_unlock_all(),
                pg_catalog.pg_advisory_xact_lock(bigint),
                pg_catalog.pg_advisory_xact_lock(integer, integer),
                pg_catalog.pg_advisory_xact_lock_shared(bigint),
                pg_catalog.pg_advisory_xact_lock_shared(integer, integer),
                pg_catalog.pg_try_advisory_lock(bigint),
                pg_catalog.pg_try_advisory_lock(integer, integer),
                pg_catalog.pg_try_advisory_lock_shared(bigint),
                pg_catalog.pg_try_advisory_lock_shared(integer, integer),
                pg_catalog.pg_try_advisory_xact_lock(bigint),
                pg_catalog.pg_try_advisory_xact_lock(integer, integer),
                pg_catalog.pg_try_advisory_xact_lock_shared(bigint),
                pg_catalog.pg_try_advisory_xact_lock_shared(integer, integer),
                pg_catalog.lo_creat(integer),
                pg_catalog.lo_create(oid),
                pg_catalog.lo_from_bytea(oid, bytea),
                pg_catalog.lo_put(oid, bigint, bytea),
                pg_catalog.lowrite(integer, bytea),
                pg_catalog.lo_truncate(integer, integer),
                pg_catalog.lo_truncate64(integer, bigint)
            TO %I',
            owner_name
        );
        EXECUTE format('GRANT TEMPORARY ON DATABASE %I TO %I', current_database(), owner_name);
    END IF;
END
$$;

-- The advisory locks: all signatures of PostgreSQL 18 (from pg_proc). A
-- viewer could keep a session-level lock on a pooled connection of the data
-- source. Such a lock blocks each writer of the SILC ledger, each move of a
-- wiki page and `prisma migrate`.
REVOKE EXECUTE ON FUNCTION
    pg_catalog.pg_advisory_lock(bigint),
    pg_catalog.pg_advisory_lock(integer, integer),
    pg_catalog.pg_advisory_lock_shared(bigint),
    pg_catalog.pg_advisory_lock_shared(integer, integer),
    pg_catalog.pg_advisory_unlock(bigint),
    pg_catalog.pg_advisory_unlock(integer, integer),
    pg_catalog.pg_advisory_unlock_shared(bigint),
    pg_catalog.pg_advisory_unlock_shared(integer, integer),
    pg_catalog.pg_advisory_unlock_all(),
    pg_catalog.pg_advisory_xact_lock(bigint),
    pg_catalog.pg_advisory_xact_lock(integer, integer),
    pg_catalog.pg_advisory_xact_lock_shared(bigint),
    pg_catalog.pg_advisory_xact_lock_shared(integer, integer),
    pg_catalog.pg_try_advisory_lock(bigint),
    pg_catalog.pg_try_advisory_lock(integer, integer),
    pg_catalog.pg_try_advisory_lock_shared(bigint),
    pg_catalog.pg_try_advisory_lock_shared(integer, integer),
    pg_catalog.pg_try_advisory_xact_lock(bigint),
    pg_catalog.pg_try_advisory_xact_lock(integer, integer),
    pg_catalog.pg_try_advisory_xact_lock_shared(bigint),
    pg_catalog.pg_try_advisory_xact_lock_shared(integer, integer)
FROM PUBLIC;

-- The large objects: the functions that make or write a large object. A
-- large object stays after the session. PostgreSQL already restricts the
-- functions that read or write a file of the server (lo_import, lo_export).
REVOKE EXECUTE ON FUNCTION
    pg_catalog.lo_creat(integer),
    pg_catalog.lo_create(oid),
    pg_catalog.lo_from_bytea(oid, bytea),
    pg_catalog.lo_put(oid, bigint, bytea),
    pg_catalog.lowrite(integer, bytea),
    pg_catalog.lo_truncate(integer, integer),
    pg_catalog.lo_truncate64(integer, bigint)
FROM PUBLIC;

-- The temporary tables. A session can write them also after
-- SET default_transaction_read_only = off.
DO $$
BEGIN
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END
$$;
