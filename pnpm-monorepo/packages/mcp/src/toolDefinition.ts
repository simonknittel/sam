import type { Actor, ApplicationContext } from "@sam-monorepo/application";
import type * as z from "zod";
import type { ToolGroup } from "./toolGroup.js";

export enum ToolKind {
  Read = "read",
  Write = "write",
}

/**
 * The hints that a client can show to the user before a call. The tools work
 * only with the data of SAM, thus `openWorldHint` is always false.
 */
export interface ToolAnnotations {
  readonly readOnlyHint: boolean;
  readonly destructiveHint: boolean;
  readonly idempotentHint: boolean;
  readonly openWorldHint: false;
}

export const READ_ONLY_TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** The data of a tool that the MCP app shows */
export interface ToolCatalogEntry {
  readonly name: string;
  readonly group: ToolGroup;
  readonly title: string;
  readonly description: string;
  readonly kind: ToolKind;
}

/** The data of the current request that a handler can need */
export interface ToolRequestScope {
  /**
   * The tools of this request: visible for the actor and not disabled by the
   * user
   */
  readonly availableTools: readonly ToolCatalogEntry[];
}

/** The JSON keys of the input and of the output are lowercase snake_case */
export interface ToolDefinition<
  InputSchema extends z.ZodObject,
  OutputSchema extends z.ZodObject,
> {
  /** Lowercase snake_case, unique in the catalog */
  readonly name: string;
  readonly group: ToolGroup;
  readonly title: string;
  /** English. Tells the model when to use the tool and what it returns. */
  readonly description: string;
  readonly annotations: ToolAnnotations;
  readonly inputSchema: InputSchema;
  /**
   * A strict object (`z.strictObject()`) also for the nested objects. The
   * registry parses each output with it, thus a field that the schema does
   * not name never leaves the server.
   */
  readonly outputSchema: OutputSchema;
  /**
   * True when the actor has at least one of the permissions that the tool can
   * work with. The handler still checks the exact permission.
   */
  readonly isVisible: (actor: Actor) => boolean;
  readonly handler: (
    context: ApplicationContext,
    actor: Actor,
    input: z.output<InputSchema>,
    scope: ToolRequestScope,
  ) => Promise<z.input<OutputSchema>>;
}

/** A tool of the catalog, without the types of its schemas */
export type CatalogTool = ToolDefinition<z.ZodObject, z.ZodObject>;

export const defineTool = <
  InputSchema extends z.ZodObject,
  OutputSchema extends z.ZodObject,
>(
  definition: ToolDefinition<InputSchema, OutputSchema>,
): CatalogTool => ({
  ...definition,
  handler: (context, actor, input, scope) =>
    // The SDK parses the arguments with `inputSchema` before the registry
    // calls the handler
    definition.handler(context, actor, input as z.output<InputSchema>, scope),
});
