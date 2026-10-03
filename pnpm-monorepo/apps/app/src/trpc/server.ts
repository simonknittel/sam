import { headers } from "next/headers";
import { cache } from "react";
import "server-only";
import { createCaller } from "../server/api/root";
import { createTRPCContext } from "../server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  return createTRPCContext({
    headers: new Headers(await headers()),
  });
});

export const api = createCaller(createContext);
