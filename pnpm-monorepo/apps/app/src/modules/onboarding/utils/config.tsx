import {
  ONBOARDING_TASK_RULES,
  OnboardingStepKey,
  OnboardingTaskKey,
} from "@sam-monorepo/domain";
import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import eventSignUpScreenshot from "../assets/event-anmeldung.png";
import eventLineupScreenshot from "../assets/event-aufstellung.png";
import eventBriefingScreenshot from "../assets/event-briefing.png";
import { OnboardingTargetId } from "./targets";

interface OnboardingStepScreenshotProps {
  readonly source: StaticImageData;
  readonly alternativeText: string;
}

/**
 * Screenshot inside a step's content — used where the tour cannot rely on
 * live data being available (e.g. there is not always an example event).
 */
const OnboardingStepScreenshot = ({
  source,
  alternativeText,
}: OnboardingStepScreenshotProps) => {
  return (
    <Image
      src={source}
      alt={alternativeText}
      /**
       * Fixed height cap with automatic width: portrait screenshots must not
       * blow up the step card. max-w-full keeps wide screenshots inside the
       * card, the aspect ratio stays intact either way.
       */
      className="mx-auto mt-3 size-auto max-h-64 max-w-full rounded-secondary border border-white/10"
    />
  );
};

export interface OnboardingStep {
  readonly key: OnboardingStepKey;
  readonly title: string;
  /**
   * Wrapped in a function (like the changelog entry bodies) so the nodes are
   * only created when the step renders.
   */
  readonly content: () => ReactNode;
  /** Route the tour navigates to before it shows this step */
  readonly route?: string;
  /**
   * Marker of the element this step highlights. Steps without a target render
   * as a centered modal instead of an anchored popover.
   */
  readonly targetId?: OnboardingTargetId;
}

export interface OnboardingTask {
  readonly key: OnboardingTaskKey;
  readonly title: string;
  /** Short summary shown in the task list of the popover */
  readonly description: string;
  readonly steps: readonly OnboardingStep[];
}

/**
 * The tasks, the steps and their permissions are rules of the domain (see
 * `ONBOARDING_TASK_RULES`). The records below hold only the presentation, thus
 * TypeScript refuses a key without a content.
 */
const ONBOARDING_TASK_CONTENT: Record<
  OnboardingTaskKey,
  Pick<OnboardingTask, "title" | "description">
> = {
  [OnboardingTaskKey.Events]: {
    title: "Lerne unsere Events kennen",
    description: "Von der Ankündigung über die Anmeldung bis zum Briefing",
  },
  [OnboardingTaskKey.Fleet]: {
    title: "Lerne unser Flottenmanagement kennen",
    description: "Füge deine Schiffe zu unserer Flotte hinzu",
  },
  [OnboardingTaskKey.BrowserNotifications]: {
    title: "Aktiviere Browserbenachrichtigungen",
    description: "Erhalte Benachrichtigungen direkt in deinem Browser",
  },
  [OnboardingTaskKey.AvatarCreator]: {
    title: "Erstelle dir einen Sinister-Avatar",
    description: "Verziere deinen Avatar mit dem Sinister-Rahmen",
  },
  [OnboardingTaskKey.Profile]: {
    title: "Vervollständige dein Profil",
    description: "Hinterlege deine Zeitzone und deinen Geburtstag",
  },
};

/** A step belongs to one task, thus the key of the step is enough */
const ONBOARDING_STEP_CONTENT: Record<
  OnboardingStepKey,
  Omit<OnboardingStep, "key">
> = {
  [OnboardingStepKey.EventsCalendar]: {
    title: "Der Kalender",
    route: "/app/dashboard",
    targetId: OnboardingTargetId.DashboardCalendar,
    content: () => (
      <>
        <p>
          Auf dem Dashboard zeigt dir der Kalender die nächsten sieben Tage:
          unsere Events und weitere Termine wie Geburtstage. Ein Klick auf ein
          Event öffnet die Detailseite mit allen weiteren Informationen.
        </p>

        <p className="mt-2">
          Über „Zum Kalender“ siehst du weitere Zeiträume und wählst aus, welche
          Termine du sehen möchtest.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.EventsSignUp]: {
    title: "Für Events anmelden",
    content: () => (
      <>
        <p>
          Events werden entweder direkt im SAM erstellt oder von unserem
          Discord-Server importiert. Dadurch gibt es einen Unterschied in der
          Anmeldung.
        </p>

        <p className="mt-2">
          Auf der Übersichtsseite eines Events findest du „Meine Teilnahme“. Bei
          SAM-Events meldest du dich direkt dort über „Anmelden“ mit einem
          optionalen Kommentar an.
        </p>

        <OnboardingStepScreenshot
          source={eventSignUpScreenshot}
          alternativeText="Die Kachel „Meine Teilnahme“ mit dem Anmelden-Button und dem Kommentarfeld"
        />

        <p className="mt-2">
          Bei Discord-Events wird die Teilnahme über Discord verwaltet: Sage
          dort zu, und deine Anmeldung erscheint auch im SAM.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.EventsBriefing]: {
    title: "Das Briefing",
    content: () => (
      <>
        <p>
          Viele Events haben ein eigenes kleines Wiki: das Briefing. Du findest
          es als eigenen Tab auf der Eventseite.
        </p>

        <p className="mt-2">
          Dort dokumentieren die Organisatoren den Ablauf und alles Weitere, was
          du für das Event wissen musst.
        </p>

        <OnboardingStepScreenshot
          source={eventBriefingScreenshot}
          alternativeText="Der Briefing-Tab eines Events mit einer Beispielseite"
        />
      </>
    ),
  },
  [OnboardingStepKey.EventsLineup]: {
    title: "Die Aufstellung",
    content: () => (
      <>
        <p>
          Bei Events mit Aufstellung siehst du alle Posten und wer sie
          übernimmt. Nach deiner Anmeldung kannst du dich dort auf offene Posten
          bewerben.
        </p>

        <p className="mt-2">
          Halte deine Flotte aktuell, damit du für Posten mit
          Schiffsanforderungen infrage kommst. Wie das funktioniert, erfährst du
          in der Tour zum Flottenmanagement.
        </p>

        <OnboardingStepScreenshot
          source={eventLineupScreenshot}
          alternativeText="Die Aufstellung eines Events mit drei Posten und den zugeteilten Citizens"
        />
      </>
    ),
  },
  [OnboardingStepKey.FleetIntroduction]: {
    title: "Warum Flottenmanagement?",
    content: () => (
      <>
        <p>
          In der Flotten-App hinterlegst du die Schiffe, die du besitzt. Auf
          dieser Grundlage planen wir die Aufstellungen für unsere Events.
        </p>

        <p className="mt-2">
          Halte deine Schiffe deshalb am besten immer aktuell – so wissen wir,
          mit welchen Schiffen wir rechnen können.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.FleetAddShips]: {
    title: "Füge deine Schiffe hinzu",
    route: "/app/fleet/my-ships",
    targetId: OnboardingTargetId.FleetAddShip,
    content: () => (
      <>
        <p>
          Über „Hinzufügen“ fügst du ein Schiff zu deiner Flotte hinzu. Wähle
          das Modell aus und vergib optional einen Namen.
        </p>

        <p className="mt-2">
          Füge am besten direkt nach der Tour deine ersten Schiffe hinzu.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.FleetOrgFleet]: {
    title: "Die Org-Flotte",
    route: "/app/fleet/org",
    targetId: OnboardingTargetId.OrgFleet,
    content: () => (
      <p>
        Hier siehst du unsere gesamte Org-Flotte – alle Schiffe, die Mitglieder
        beigesteuert haben. Deine Schiffe zählen dazu, sobald du sie hinzugefügt
        hast.
      </p>
    ),
  },
  [OnboardingStepKey.NotificationsIntroduction]: {
    title: "Benachrichtigungen des SAM",
    content: () => (
      <>
        <p>
          Das SAM verschickt Benachrichtigungen, zum Beispiel zu neuen Events
          oder wenn dich jemand im Wiki erwähnt.
        </p>

        <p className="mt-2">
          Mit Browserbenachrichtigungen erhältst du sie sofort – auch wenn die
          App gerade nicht geöffnet ist.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.NotificationsEnable]: {
    title: "Aktiviere die Benachrichtigungen",
    route: "/app/account/notifications",
    targetId: OnboardingTargetId.NotificationsEnable,
    content: () => (
      <>
        <p>
          Klicke auf „Genehmigung anfordern“ und erlaube die Benachrichtigungen
          in deinem Browser.
        </p>

        <p className="mt-2">
          Weiter unten auf der Seite kannst du bei Bedarf einzelne
          Benachrichtigungsarten abwählen.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.AvatarCreatorIntroduction]: {
    title: "Der Avatar Creator",
    route: "/app/avatar-creator",
    targetId: OnboardingTargetId.AvatarCreator,
    content: () => (
      <>
        <p>
          Mit dem Avatar Creator verzierst du dein Profilbild mit dem
          offiziellen Sinister Incorporated-Rahmen.
        </p>

        <p className="mt-2">
          Den fertigen Avatar kannst du zum Beispiel als Profilbild auf unserem
          Discord-Server verwenden.
        </p>
      </>
    ),
  },
  [OnboardingStepKey.AvatarCreatorCreate]: {
    title: "Erstelle deinen Avatar",
    route: "/app/avatar-creator",
    targetId: OnboardingTargetId.AvatarCreator,
    content: () => (
      <p>
        Lade hier dein Bild hoch, wähle eine Hintergrundfarbe und positioniere
        das Bild im Rahmen. Über „Herunterladen“ speicherst du das Ergebnis.
      </p>
    ),
  },
  [OnboardingStepKey.ProfileComplete]: {
    title: "Zeitzone und Geburtstag",
    route: "/app/account/profile",
    targetId: OnboardingTargetId.ProfileForm,
    content: () => (
      <>
        <p>
          Hinterlege hier deine Zeitzone und deinen Geburtstag. Die Zeitzone
          hilft anderen Mitgliedern bei der Planung von Events.
        </p>

        <p className="mt-2">
          An deinem Geburtstag gibt es außerdem Glückwünsche.
        </p>
      </>
    ),
  },
};

const ONBOARDING_TASKS: readonly OnboardingTask[] = ONBOARDING_TASK_RULES.map(
  (rule) => ({
    key: rule.key,
    ...ONBOARDING_TASK_CONTENT[rule.key],
    steps: rule.steps.map((step) => ({
      key: step.key,
      ...ONBOARDING_STEP_CONTENT[step.key],
    })),
  }),
);

export const getOnboardingTaskByKey = (taskKey: OnboardingTaskKey) =>
  ONBOARDING_TASKS.find((task) => task.key === taskKey);
