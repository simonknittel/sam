import {
  PERMISSION_STRING_PATTERN,
  ROLE_NAME_MAXIMUM_LENGTH,
  ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM,
  ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH,
  ROLE_TAG_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { idSchema } from "../pagination.js";

/**
 * A role has much fewer permission strings or inherited roles, and a citizen
 * has much fewer roles. The limit keeps the writes bounded.
 */
export const MAXIMUM_ROLE_RELATIONS = 250;

export const roleNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(ROLE_NAME_MAXIMUM_LENGTH);

export const permissionStringSchema = z
  .string()
  .trim()
  .min(1)
  .regex(PERMISSION_STRING_PATTERN)
  .describe(
    "A permission string: `resource;operation`, followed by any number of `;key=value` attributes.",
  );

export const roleTagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(ROLE_TAG_NAME_MAXIMUM_LENGTH);

/** The use cases store an empty description as null */
export const roleTagDescriptionSchema = z
  .string()
  .trim()
  .max(ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH);

/** An add or remove list of the links between roles and tags */
export const roleTagAssignmentIdsSchema = z
  .array(idSchema)
  .max(ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM)
  .default([]);
