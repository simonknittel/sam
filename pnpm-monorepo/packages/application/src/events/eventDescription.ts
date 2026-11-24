import { getEventDescriptionMaxLength } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { getEventPageUrl } from "./eventUrl.js";

/**
 * The description and the sign-up note that the app adds to the Discord event
 * must fit into the cap of Discord. Also for an event that is not published: a
 * later publication needs it.
 */
export const requireDescriptionFitsDiscord = (
  context: Pick<ApplicationContext, "urls">,
  description: string | null | undefined,
) => {
  const maxLength = getEventDescriptionMaxLength((eventId) =>
    getEventPageUrl(context.urls, eventId),
  );
  if (description && description.length > maxLength)
    throw new ValidationError(EventErrorMessage.DescriptionTooLong);
};
