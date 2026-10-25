import {
  listPenaltyEntries,
  listPenaltyEntriesInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { penaltyEntryOutputSchema } from "./penaltyEntryOutputSchema.js";

export const listPenaltyEntriesTool = defineTool({
  name: "list_penalty_entries",
  group: ToolGroup.PenaltyPoints,
  title: "List penalty entries",
  description:
    "Gives the penalty entries (points, reason, author and expiry) of all citizens or of one citizen (citizen_id from a Spynet tool), the newest first; status active means not expired and not deleted, inactive means expired and not deleted. A user who can read only the own entries must give the citizen id of get_current_user.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.PENALTY_ENTRIES_LISTED,
  inputSchema: listPenaltyEntriesInputSchema,
  outputSchema: z.strictObject({
    entries: z.array(penaltyEntryOutputSchema),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) =>
    actor.authorize("penaltyEntry", "read") ||
    (actor.authorize("ownPenaltyEntry", "read") &&
      actor.authorize("citizen", "read") &&
      actor.citizen !== null),
  handler: async (context, actor, input) => {
    const { entries, next_cursor } = await listPenaltyEntries(
      context,
      actor,
      input,
    );

    return { entries, next_cursor };
  },
});
