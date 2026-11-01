import {
  listCitizens,
  listCitizensInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const listCitizensTool = defineTool({
  name: "list_citizens",
  group: ToolGroup.Spynet,
  title: "List citizens",
  description:
    "Lists the citizens of the Spynet, filtered by role ids and by missing values (`unknown`) and sorted. The result is paged: give next_cursor as cursor to continue the list; total is the number of citizens with these filters. Each citizen has an id for the other tools; the handle is only display text. The Discord ID, the TeamSpeak ID and the last visit are null without the permission to read them.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.CITIZENS_LISTED,
  inputSchema: listCitizensInputSchema,
  outputSchema: z.strictObject({
    citizens: z.array(
      z.strictObject({
        id: z.string(),
        handle: z.string().nullable(),
        spectrum_id: z.string().nullable(),
        discord_id: z.string().nullable(),
        teamspeak_id: z.string().nullable(),
        created_at: dateTimeOutputSchema,
        last_seen_at: dateTimeOutputSchema.nullable(),
        role_ids: z.array(z.string()),
      }),
    ),
    total: z.int().min(0),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) =>
    actor.authorize("citizen", "read") &&
    actor.authorize("spynetCitizen", "read"),
  handler: async (context, actor, input) => {
    const { citizens, total, next_cursor } = await listCitizens(
      context,
      actor,
      input,
    );
    return { citizens, total, next_cursor };
  },
});
