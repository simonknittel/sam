import type { ApplicationContext } from "../../context.js";
import {
  EVENT_ORGANIZER_SELECT,
  findEventOrganizers,
  type EventOrganizerRecipients,
} from "./eventOrganizers.js";

export interface FindEventPositionApplicationRecipientsInput {
  readonly applicationId: string;
}

export interface EventPositionApplicationRecipients extends EventOrganizerRecipients {
  readonly position: { readonly name: string };
}

/**
 * The organizers of the event who hear about a new application (see
 * `findEventOrganizers()`), without the applicant. Null when the application
 * does not exist: the applicant withdrew it, or the end of the participation
 * removed it.
 */
export const findEventPositionApplicationRecipients = async (
  context: ApplicationContext,
  input: FindEventPositionApplicationRecipientsInput,
): Promise<EventPositionApplicationRecipients | null> => {
  const application = await context.prisma.eventPositionApplication.findUnique({
    where: { id: input.applicationId },
    select: {
      citizenId: true,
      citizen: { select: { handle: true } },
      position: {
        select: {
          name: true,
          event: {
            select: { id: true, name: true, ...EVENT_ORGANIZER_SELECT },
          },
        },
      },
    },
  });
  // Only the positions of an event template have no event
  const event = application?.position.event;
  if (!application || !event) return null;

  return {
    event: { id: event.id, name: event.name },
    position: { name: application.position.name },
    citizen: { handle: application.citizen.handle },
    recipients: await findEventOrganizers(
      context,
      event,
      application.citizenId,
    ),
  };
};
