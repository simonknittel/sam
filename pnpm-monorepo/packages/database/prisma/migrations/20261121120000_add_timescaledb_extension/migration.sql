-- TimescaleDB keeps time series data. The extension is not trusted, thus only
-- a superuser can create it, and the server must load it at start
-- (shared_preload_libraries). On the servers, the deploy of the database
-- creates the extension as superuser, thus this migration changes nothing
-- there. See docs/setup-test-and-production.md.
CREATE EXTENSION IF NOT EXISTS timescaledb;
