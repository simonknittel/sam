import { getUsableEventTemplates as query } from "@/modules/event-templates/queries/getEventTemplates";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * The templates the current viewer may create an event from, with everything
 * the create form prefills. Loaded lazily by the form, which only mounts
 * while the modal is open.
 */
export const getUsableEventTemplates = protectedProcedure.query(async () => {
  try {
    const templates = await query();

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      visibility: template.visibility,
      visibilityRoleIds: template.visibilityRoles.map(
        (visibilityRole) => visibilityRole.roleId,
      ),
      coverImageId: template.coverImageId,
    }));
  } catch (error) {
    log.error("Failed to fetch usable event templates", {
      error: serializeError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch usable event templates",
    });
  }
});
