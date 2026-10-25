import {
  CitizenNoteConfirmation,
  listCitizenNotes,
  listCitizenNotesInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { citizenReferenceSchema, dateTimeOutputSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

const namedReferenceSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
});

export const listCitizenNotesTool = defineTool({
  name: "list_citizen_notes",
  group: ToolGroup.Spynet,
  title: "List the notes of a citizen",
  description:
    "Lists the Spynet notes about a citizen (by the citizen id), the newest first, with the note type, the classification level and the confirmation state. A note that the user may only see redacted has `redacted: true` and no content. created_by and confirmed_at are null for a user who cannot open the notes page of the Spynet. The notes are in German.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.CITIZEN_NOTES_LISTED,
  inputSchema: listCitizenNotesInputSchema,
  outputSchema: z.strictObject({
    notes: z.array(
      z.discriminatedUnion("redacted", [
        z.strictObject({
          redacted: z.literal(false),
          id: z.string(),
          note_type: namedReferenceSchema,
          classification_level: namedReferenceSchema.nullable(),
          confirmed: z.enum(CitizenNoteConfirmation),
          confirmed_at: dateTimeOutputSchema.nullable(),
          created_at: dateTimeOutputSchema,
          created_by: citizenReferenceSchema.nullable(),
          content: z.string().nullable(),
        }),
        z.strictObject({
          redacted: z.literal(true),
          id: z.string(),
          note_type: namedReferenceSchema,
        }),
      ]),
    ),
    next_cursor: z.string().nullable(),
  }),
  /**
   * The note permissions always have the attributes of a note type and a
   * classification level, and a check without attributes does not match
   * them. Thus the tool shows with the permission that the notes page needs.
   */
  isVisible: (actor) => actor.authorize("citizen", "read"),
  handler: listCitizenNotes,
});
