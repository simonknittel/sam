import { prisma, type Entity } from "@sam-monorepo/database";
import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { BIRTHDAY_FALLBACK_WORDING } from "@sam-monorepo/notifications";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Entity["id"];
}

/**
 * The greeting picks one of these for each citizen, so that a citizen does
 * not read the same sentence every year. The greeting keeps no memory of
 * the previous year, thus the same wording can come up twice in a row.
 */
const WORDINGS = [
  BIRTHDAY_FALLBACK_WORDING,
  {
    title: "Herzlichen Glückwunsch zum Geburtstag!",
    body: "Wir wünschen dir alles Gute und ein weiteres Jahr voller sanfter Landungen.",
  },
  {
    title: "Happy Birthday!",
    body: "Heute wird gefeiert. Wir hoffen, du hast einen großartigen Tag.",
  },
  {
    title: "Alles Gute!",
    body: "Lass dich feiern. Das Verse kommt heute auch mal ohne dich aus.",
  },
  {
    title: "Ein Hoch auf dich!",
    body: "Zum Geburtstag wünschen wir dir nur das Beste und immer volle Tanks.",
  },
  {
    title: "Zeit zu feiern!",
    body: "Heute ist dein Tag. Wir wünschen dir viel Freude und einen entspannten Geburtstag.",
  },
  {
    title: "Die Crew gratuliert!",
    body: "Alles Gute zum Geburtstag. Schön, dass du an Bord bist.",
  },
] as const;

const pickWording = () =>
  WORDINGS[Math.floor(Math.random() * WORDINGS.length)] ??
  BIRTHDAY_FALLBACK_WORDING;

/**
 * A personal greeting to the citizen who has their birthday. Nobody else is
 * told about it, thus the only condition is that the citizen can open the
 * app and read the greeting.
 *
 * The picked wording travels in the payload as well, so that the on-site row
 * carries the same text as the web push notification.
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

  const wording = pickWording();

  await publishNotifications([
    {
      receiverId: citizen.id,
      notificationType: "birthday" as const,
      payload: { title: wording.title, body: wording.body },
      title: wording.title,
      body: wording.body,
    },
  ]);
};
