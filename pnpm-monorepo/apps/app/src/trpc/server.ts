import { headers } from "next/headers";
import { cache } from "react";
import "server-only";
import { createCaller } from "../server/api/root";
import { createTRPCContext } from "../server/api/trpc";

const createContext = cache(async () => {
  return createTRPCContext({
    headers: new Headers(await headers()),
  });
});

export const api = createCaller(createContext);
