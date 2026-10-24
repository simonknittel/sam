import {
  findGreetingRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen } from "@sam-monorepo/database";
import { ONBOARDING_POPOVER_PATH } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Citizen["id"];
}

/**
 * The welcome picks one of these for each citizen. Each citizen gets only
 * one welcome, thus the pool gives variety among the members of the
 * organization.
 */
const WORDINGS = [
  {
    title: "Willkommen an Bord!",
    body: "Schön, dass du da bist. Im SAM findest du Events, Flotte und mehr. Mit „Erste Schritte“ lernst du es kennen.",
  },
  {
    title: "o7, Citizen!",
    body: "Willkommen in der Org. Unter „Erste Schritte“ zeigen dir kurze Touren, wie das SAM funktioniert.",
  },
  {
    title: "Schön, dass du da bist!",
    body: "Dein Hangar im SAM ist bereit. Starte mit „Erste Schritte“ und lerne Events und Flotte kennen.",
  },
  {
    title: "Willkommen in der Crew!",
    body: "Ab heute fliegst du mit uns. „Erste Schritte“ bringt dich schnell auf Kurs.",
  },
  {
    title: "Andockerlaubnis erteilt!",
    body: "Willkommen im SAM. Mit „Erste Schritte“ findest du dich hier schnell zurecht.",
  },
  {
    title: "Neuer Pilot an Bord!",
    body: "Willkommen in der Org. Ein kurzer Rundflug mit „Erste Schritte“ zeigt dir Events, Flotte und dein Profil.",
  },
  {
    title: "Quantum-Sprung geglückt!",
    body: "Du bist angekommen. Willkommen im SAM! Mit „Erste Schritte“ lernst du die wichtigsten Bereiche kennen.",
  },
  {
    title: "Kurs gesetzt!",
    body: "Willkommen in der Org. Dein erstes Ziel: „Erste Schritte“. Dort lernst du das SAM in wenigen Minuten kennen.",
  },
  {
    title: "Die Crew begrüßt dich!",
    body: "Willkommen an Bord. Trag deine Schiffe ein, melde dich zu Events an und schau bei „Erste Schritte“ vorbei.",
  },
  {
    title: "Startfreigabe erteilt!",
    body: "Willkommen im SAM. Mit „Erste Schritte“ machst du dich in wenigen Minuten startklar.",
  },
] as const;

const pickWording = () =>
  WORDINGS[Math.floor(Math.random() * WORDINGS.length)] ?? WORDINGS[0];

/**
 * A personal welcome to the citizen on the first day they can open the app
 * (see `findGreetingRecipient()` for the condition). The app sends the
 * request once for each citizen (see `Citizen.welcomedAt`).
 *
 * The picked wording travels in the payload as well, so that the on-site row
 * carries the same text as the web push notification. Both link to the
 * dashboard, where the "Erste Schritte" popover opens.
 */
export const WelcomeGreetingHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const recipient = await findGreetingRecipient(context, {
    citizenId: payload.citizenId,
  });
  if (!recipient) return;

  const wording = pickWording();

  await publishNotifications(context, [
    {
      receiverId: recipient.citizenId,
      notificationType: "welcome" as const,
      payload: { title: wording.title, body: wording.body },
      title: wording.title,
      body: wording.body,
      url: ONBOARDING_POPOVER_PATH,
    },
  ]);
};
