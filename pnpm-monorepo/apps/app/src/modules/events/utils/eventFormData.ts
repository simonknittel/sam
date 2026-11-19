import { toEventVisibilityType } from "@sam-monorepo/application";
import { EventVisibility } from "@sam-monorepo/database/client";
import * as z from "zod";

/**
 * The details of the create and the settings forms in the input of
 * `createEvent()`, `updateEvent()` and `updateEventTemplate()`. An empty
 * description removes it. The times are the wall times of the
 * `datetime-local` fields: the use cases read them in the time zone of the
 * organization.
 *
 * A field that the form does not have is undefined: the settings pages have a
 * form for each tile, and the update use cases change only the given fields.
 */
export const parseEventDetailsFormData = (formData: FormData) => {
  const visibility = formData.get("visibility");

  return {
    name: formData.get("name") ?? undefined,
    description: formData.has("description")
      ? formData.get("description") || null
      : undefined,
    start_time: formData.get("startTime") ?? undefined,
    end_time: formData.get("endTime") ?? undefined,
    visibility:
      visibility === null
        ? undefined
        : toEventVisibilityType(z.enum(EventVisibility).parse(visibility)),
    // The roles belong to the visibility, thus they are in the same form
    visibility_role_ids:
      visibility === null ? undefined : formData.getAll("visibilityRole[]"),
  };
};
