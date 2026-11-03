import {
  findPenaltyEntryRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type PenaltyEntry } from "@sam-monorepo/database";
import { getPenaltyEntryDeletedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  penaltyEntryId: PenaltyEntry["id"];
}

export const PenaltyEntryDeletedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findPenaltyEntryRecipient(context, {
    penaltyEntryId: payload.penaltyEntryId,
  });
  if (!result) return;

  const text = getPenaltyEntryDeletedText(result.penaltyEntry);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "penalty_entry_deleted" as const,
      payload: result.penaltyEntry,
      ...text,
    })),
  );
};
