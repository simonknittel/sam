// Type-, enum- and namespace-only entry point. Unlike the package root, this
// module must never construct a client or read the environment so it stays
// safe to import from any server module without side effects.
export * from "./generated/prisma/client.js";
