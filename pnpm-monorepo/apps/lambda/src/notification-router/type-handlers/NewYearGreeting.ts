import { prisma, type Entity } from "@sam-monorepo/database";
import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";
import { pickWording } from "./newYearWordings";

interface Payload {
  citizenId: Entity["id"];
  year: number;
}

/**
 * A personal greeting to the citizen who enters the new year. Nobody else is
 * told about it, thus the only condition is that the citizen can open the
 * app and read the greeting. Minutes can pass between the job and this
 * handler, thus the permission is checked again here.
 */
export const NewYearGreetingHandler = async (payload: Payload) => {
  const citizen = await prisma.entity.findFirst({
    where: {
      AND: [{ id: payload.citizenId }, CAN_LOGIN_CITIZEN_WHERE],
    },
    select: {
      id: true,
    },
  });
  if (!citizen) return;

  const wording = pickWording(payload.year);

  await publishNotifications([
    {
      receiverId: citizen.id,
      notificationType: "new_year" as const,
      payload: { title: wording.title, body: wording.body },
      title: wording.title,
      body: wording.body,
    },
  ]);
};
