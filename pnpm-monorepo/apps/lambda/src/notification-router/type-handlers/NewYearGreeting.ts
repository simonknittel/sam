import {
  findGreetingRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen } from "@sam-monorepo/database";
import { publishNotifications } from "../publish";
import { pickWording } from "./newYearWordings";

interface Payload {
  citizenId: Citizen["id"];
  year: number;
}

export const NewYearGreetingHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const recipient = await findGreetingRecipient(context, {
    citizenId: payload.citizenId,
  });
  if (!recipient) return;

  const wording = pickWording(payload.year);

  await publishNotifications(context, [
    {
      receiverId: recipient.citizenId,
      notificationType: "new_year" as const,
      payload: { title: wording.title, body: wording.body },
      title: wording.title,
      body: wording.body,
    },
  ]);
};
