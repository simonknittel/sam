import {
  findPenaltyEntryExpiredRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type PenaltyEntry } from "@sam-monorepo/database";
import { getPenaltyEntryExpiredText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  penaltyEntryId: PenaltyEntry["id"];
}

export const PenaltyEntryExpiredHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findPenaltyEntryExpiredRecipient(context, {
    penaltyEntryId: payload.penaltyEntryId,
  });
  if (!result) return;

  const text = getPenaltyEntryExpiredText(result.penaltyEntry);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "penalty_entry_expired" as const,
      payload: result.penaltyEntry,
      ...text,
    })),
  );
};
