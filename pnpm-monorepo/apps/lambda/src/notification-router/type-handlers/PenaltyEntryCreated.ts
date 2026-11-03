import {
  findPenaltyEntryRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type PenaltyEntry } from "@sam-monorepo/database";
import { getPenaltyEntryCreatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  penaltyEntryId: PenaltyEntry["id"];
}

export const PenaltyEntryCreatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findPenaltyEntryRecipient(context, {
    penaltyEntryId: payload.penaltyEntryId,
  });
  if (!result) return;

  const text = getPenaltyEntryCreatedText(result.penaltyEntry);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "penalty_entry_created" as const,
      payload: result.penaltyEntry,
      ...text,
    })),
  );
};
