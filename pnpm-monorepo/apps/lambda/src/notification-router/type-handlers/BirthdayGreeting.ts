import { prisma, type Entity } from "@sam-monorepo/database";
import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { BIRTHDAY_FALLBACK_WORDING } from "@sam-monorepo/notifications";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Entity["id"];
}

/**
 * The greeting picks one of these for each citizen, so that a citizen does
 * not read the same sentence every year. The greeting keeps no memory of the
 * previous year, thus the same wording can occur twice in sequence.
 */
const WORDINGS = [
  BIRTHDAY_FALLBACK_WORDING,
  {
    title: "Herzlichen Glückwunsch zum Geburtstag!",
    body: "Wir wünschen dir alles Gute und ein weiteres Jahr voller sanfter Landungen.",
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
    title: "Die Crew gratuliert!",
    body: "Alles Gute zum Geburtstag. Schön, dass du an Bord bist.",
  },
  {
    title: "o7, Citizen!",
    body: "Alles Gute zum Geburtstag. Die ganze Org salutiert dir heute.",
  },
  {
    title: "Auf dein neues Jahr!",
    body: "Möge dein Quantum-Antrieb immer kalibriert und dein Kurs immer frei sein.",
  },
  {
    title: "Feiertag im Stanton-System!",
    body: "Heute ist dein Ehrentag. Lass es dir gut gehen, Citizen.",
  },
  {
    title: "Herzlichen Glückwunsch!",
    body: "Wir wünschen dir ein Jahr ohne 30k und mit immer freier Landeplattform.",
  },
  {
    title: "Happy Birthday, Citizen!",
    body: "Mögen all deine Claims sofort durchgehen und deine Fracht heil ankommen.",
  },
  {
    title: "Ein Toast auf dich!",
    body: "Die erste Runde geht heute aufs Haus, irgendwo zwischen New Babbage und Area18.",
  },
  {
    title: "Glückwunsch, Pilot!",
    body: "Wir wünschen dir einen großartigen Tag und freie Bahn bis nach Terra.",
  },
  {
    title: "Alles Gute, Commander!",
    body: "Mögen deine Aufzüge heute immer kommen und deine Türen sich öffnen.",
  },
  {
    title: "Dein Hangar ist reserviert!",
    body: "Herzlichen Glückwunsch zum Geburtstag. Wir wünschen dir einen großartigen Tag.",
  },
  {
    title: "Ein Jahr weiter!",
    body: "Möge dein Med-Bed heute unbenutzt bleiben und dein Schiff ohne Kratzer.",
  },
  {
    title: "Ruhige Sprünge!",
    body: "Alles Gute zum Geburtstag. Wir wünschen dir eine sichere Reise durch den Aaron Halo.",
  },
  {
    title: "Party auf Daymar!",
    body: "Heute ist dein Tag. Wir wünschen dir einen unvergesslichen Geburtstag.",
  },
  {
    title: "Salut, Citizen!",
    body: "Alles Gute zum Geburtstag. Heute gehört dir das ganze System.",
  },
  {
    title: "Grüße aus Pyro!",
    body: "Sogar im gefährlichsten System wird heute für dich gefeiert.",
  },
  {
    title: "Volle Kraft voraus!",
    body: "Wir wünschen dir ein neues Lebensjahr mit gutem Kurs und stabilen Servern.",
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
