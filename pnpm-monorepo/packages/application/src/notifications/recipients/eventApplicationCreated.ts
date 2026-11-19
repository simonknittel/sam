import { EventApplicationStatus } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../../context.js";
import { toEventApplicationStatus } from "../../events/eventApplicationStatus.js";
import {
  EVENT_ORGANIZER_SELECT,
  findEventOrganizers,
  type EventOrganizerRecipients,
} from "./eventOrganizers.js";

export interface EventApplicationRecipients extends EventOrganizerRecipients {
  readonly application: {
    /** The note of the applicant */
    readonly comment: string | null;
  };
}

/**
 * The organizers of the event who hear about a new application to take part
 * in it (see `findEventOrganizers()`), without the applicant. Null when the
 * application does not exist or is not open anymore: the managers need no
 * notification about an application that a manager answered or that the
 * applicant withdrew.
 */
export const findEventApplicationRecipients = async (
  context: ApplicationContext,
  { applicationId }: { readonly applicationId: string },
): Promise<EventApplicationRecipients | null> => {
  const application = await context.prisma.eventApplication.findUnique({
    where: { id: applicationId },
    select: {
      citizenId: true,
      comment: true,
      approvedAt: true,
      declinedAt: true,
      withdrawnAt: true,
      citizen: { select: { handle: true } },
      event: { select: { id: true, name: true, ...EVENT_ORGANIZER_SELECT } },
    },
  });
  if (
    !application ||
    toEventApplicationStatus(application) !== EventApplicationStatus.Open
  )
    return null;

  return {
    event: { id: application.event.id, name: application.event.name },
    citizen: { handle: application.citizen.handle },
    application: { comment: application.comment },
    recipients: await findEventOrganizers(context, application.event, {
      excludedCitizenId: application.citizenId,
    }),
  };
};
