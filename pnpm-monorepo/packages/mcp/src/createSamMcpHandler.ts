import {
  createMcpHandler,
  McpServer,
  type McpHttpHandler,
} from "@modelcontextprotocol/server";
import type { Actor, ApplicationContext } from "@sam-monorepo/application";
import * as z from "zod";
import { getInstructions } from "./instructions.js";
import { registerTools } from "./registry.js";
import { registerSkills, SKILLS_EXTENSION_ID } from "./skillRegistry.js";

export const SERVER_NAME = "sam";

const SERVER_TITLE = "SAM";

/**
 * The host authenticates the request and gives the principal to
 * `handler.fetch()` in `authInfo.extra`
 */
export interface McpPrincipalExtra {
  readonly context: ApplicationContext;
  readonly actor: Actor;
  readonly disabledToolNames: readonly string[];
}

export const toAuthInfoExtra = (
  principal: McpPrincipalExtra,
): Record<string, unknown> => ({ ...principal });

const isObject = (value: unknown) =>
  typeof value === "object" && value !== null;

/** The SDK types `authInfo.extra` as a record, thus the factory checks it */
const principalExtraSchema = z.object({
  context: z.custom<ApplicationContext>(isObject),
  actor: z.custom<Actor>(isObject),
  disabledToolNames: z.array(z.string()),
});

export interface CreateSamMcpHandlerOptions {
  readonly serverVersion: string;
  /**
   * Gets the errors that do not go to the client and the rejected requests,
   * for example a request of the legacy `initialize` handshake
   */
  readonly onerror: (error: Error) => void;
}

/**
 * Create it one time. Each request gets a new server with the tools of its
 * principal.
 */
export const createSamMcpHandler = ({
  serverVersion,
  onerror,
}: CreateSamMcpHandlerOptions): McpHttpHandler =>
  createMcpHandler(
    ({ authInfo }) => {
      const principal = principalExtraSchema.safeParse(authInfo?.extra);
      if (!principal.success)
        throw new Error(
          "The request has no principal. The host must authenticate the request before it calls the handler.",
        );

      const { context, actor, disabledToolNames } = principal.data;
      const server = new McpServer(
        { name: SERVER_NAME, version: serverVersion, title: SERVER_TITLE },
        {
          instructions: getInstructions(),
          // `tools/list` must answer also when the user disabled all tools.
          // Without subscriptions, a client cannot get a change of the list.
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
            extensions: { [SKILLS_EXTENSION_ID]: {} },
          },
        },
      );
      registerTools(server, context, actor, { disabledToolNames });
      registerSkills(server);

      return server;
    },
    {
      // Only the 2026-07-28 revision. The legacy `initialize` handshake gets
      // the unsupported-protocol-version error.
      legacy: "reject",
      // A serverless host has no shared event bus for `subscriptions/listen`
      maxSubscriptions: 0,
      onerror,
    },
  );
