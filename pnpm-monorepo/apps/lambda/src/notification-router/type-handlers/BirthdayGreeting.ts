import { prisma, type Entity } from "@sam-monorepo/database";
import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Entity["id"];
}

/**
 * A personal greeting to the citizen who has their birthday. Nobody else is
 * told about it, thus the only condition is that the citizen can open the
 * app and read the greeting.
 */
export const BirthdayGreetingHandler = async (payload: Payload) => {
  const citizen = await prisma.entity.findFirst({
    where: {
      AND: [{ id: payload.citizenId }, CAN_LOGIN_CITIZEN_WHERE],
    },
    select: {
      id: true,
    },
  });
  if (!citizen) return;

  await publishNotifications([
    {
      receiverId: citizen.id,
      notificationType: "birthday" as const,
      payload: {},
      title: "Alles Gute zum Geburtstag!",
      body: "Wir wünschen dir einen schönen Tag.",
    },
  ]);
};
