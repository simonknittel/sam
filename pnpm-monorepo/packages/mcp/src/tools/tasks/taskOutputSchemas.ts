import {
  TaskRewardKind,
  TaskStatus,
  TaskVisibilityKind,
  type Actor,
} from "@sam-monorepo/application";
import * as z from "zod";
import { citizenReferenceSchema, dateTimeOutputSchema } from "../../schemas.js";

/** The fields of a task in `list_tasks`, and the base of `get_task` */
export const taskListItemOutputShape = {
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().describe("Markdown."),
  status: z.enum(TaskStatus),
  created_at: dateTimeOutputSchema,
  expires_at: dateTimeOutputSchema.nullable(),
  created_by: citizenReferenceSchema.nullable(),
  assignees: z.array(citizenReferenceSchema),
  reward: z.strictObject({
    type: z.enum(TaskRewardKind),
    value: z
      .union([z.number().int(), z.string()])
      .nullable()
      .describe(
        "The SILC for each completionist, or the Markdown text of a text reward.",
      ),
  }),
  visibility: z.enum(TaskVisibilityKind),
  is_assigned_to_me: z.boolean(),
  is_new: z.boolean(),
};

/** One task with its details: the output of `get_task` and of the writes */
export const taskOutputSchema = z.strictObject({
  ...taskListItemOutputShape,
  completionists: z.array(citizenReferenceSchema),
  required_roles: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
    }),
  ),
  has_required_role: z.boolean(),
  can_manage: z.boolean(),
  is_updatable: z.boolean(),
  repeatable: z.number().int(),
  hidden_for_other_roles: z.boolean(),
  assignment_limit: z.number().int().nullable(),
});

/**
 * The task writes need a citizen (the assignments and the visibility use
 * it), like `get_task`
 */
export const isTaskWriteToolVisible = (actor: Actor) =>
  actor.authorize("task", "read") && actor.citizen !== null;
