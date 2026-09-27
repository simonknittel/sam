import { inject } from "vitest";

/**
 * The database package reads the URL when a test file imports it, thus the
 * URL must be in place before the test files load.
 */
process.env.DATABASE_URL = inject("databaseUrl");
