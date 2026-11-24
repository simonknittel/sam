import {
  DISCORD_EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_VISIBILITY_ROLES,
  EVENT_NAME_MAX_LENGTH,
  EVENT_PARTICIPATION_TEXT_MAX_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { idSchema } from "../pagination.js";
import { EventVisibilityType } from "./eventOutput.js";

export const eventNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(EVENT_NAME_MAX_LENGTH);

/**
 * The use cases also check the smaller limit that leaves room for the sign-up
 * note of the Discord event (see `requireDescriptionFitsDiscord()`)
 */
export const eventDescriptionSchema = z
  .string()
  .trim()
  .max(DISCORD_EVENT_DESCRIPTION_MAX_LENGTH)
  .nullable()
  .describe(
    "Plain text. Together with the sign-up note that SAM adds to the Discord event (about 100 characters), it must fit into 1000 characters. Null or an empty text means no description.",
  );

export const eventVisibilitySchema = z
  .enum(EventVisibilityType)
  .describe(
    "public: every user who can read events sees it. restricted: only the holders of visibility_role_ids, the creator, the managers and the event managers of the organization see it.",
  );

export const visibilityRoleIdsSchema = z
  .array(idSchema)
  .max(EVENT_MAX_VISIBILITY_ROLES)
  .describe(
    "The role ids (from list_roles) that see a restricted event. A restricted event needs at least one. A public event ignores them.",
  );

export const participationTextSchema = z
  .string()
  .trim()
  .max(EVENT_PARTICIPATION_TEXT_MAX_LENGTH);
