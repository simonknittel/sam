import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import eventSignUpScreenshot from "../assets/event-anmeldung.png";
import eventLineupScreenshot from "../assets/event-aufstellung.png";
import eventBriefingScreenshot from "../assets/event-briefing.png";
import { OnboardingTargetId } from "./targets";

export enum OnboardingTaskKey {
  Events = "events",
  Fleet = "fleet",
  BrowserNotifications = "browser-notifications",
  AvatarCreator = "avatar-creator",
  Profile = "profile",
}

export enum OnboardingStepKey {
  EventsCalendar = "events-calendar",
  EventsSignUp = "events-sign-up",
  EventsBriefing = "events-briefing",
  EventsLineup = "events-lineup",
  FleetIntroduction = "fleet-introduction",
  FleetAddShips = "fleet-add-ships",
  FleetOrgFleet = "fleet-org-fleet",
  NotificationsIntroduction = "notifications-introduction",
  NotificationsEnable = "notifications-enable",
  AvatarCreatorIntroduction = "avatar-creator-introduction",
  AvatarCreatorCreate = "avatar-creator-create",
  ProfileComplete = "profile-complete",
}

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
      className="mt-3 max-h-64 w-auto h-auto max-w-full mx-auto rounded-secondary border border-white/10"
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
  /** The step is only shown when at least one string is satisfied */
  readonly requiredPermissionStrings?: readonly string[];
}

export interface OnboardingTask {
  readonly key: OnboardingTaskKey;
  readonly title: string;
  /** Short summary shown in the task list of the popover */
  readonly description: string;
  /** The task is only shown when at least one string is satisfied */
  readonly requiredPermissionStrings?: readonly string[];
  readonly steps: readonly OnboardingStep[];
}

export const ONBOARDING_TASKS: readonly OnboardingTask[] = [
  {
    key: OnboardingTaskKey.Events,
    title: "Lerne unsere Events kennen",
    description: "Von der Ankündigung über die Anmeldung bis zum Briefing",
    requiredPermissionStrings: ["event;read"],
    steps: [
      {
        key: OnboardingStepKey.EventsCalendar,
        title: "Der Eventkalender",
        route: "/app/dashboard",
        targetId: OnboardingTargetId.DashboardCalendar,
        content: () => (
          <>
            <p>
              Auf dem Dashboard siehst du unsere nächsten Events. Ein Klick auf
              ein Event öffnet die Detailseite mit allen weiteren Informationen.
            </p>
          </>
        ),
      },
      {
        key: OnboardingStepKey.EventsSignUp,
        title: "Für Events anmelden",
        content: () => (
          <>
            <p>
              Events werden entweder direkt im SAM erstellt oder von unserem
              Discord-Server importiert. Dadurch gibt es einen Unterschied in
              der Anmeldung.
            </p>

            <p className="mt-2">
              Auf der Übersichtsseite eines Events findest du „Meine Teilnahme“.
              Bei SAM-Events meldest du dich direkt dort über „Anmelden“ mit
              einem optionalen Kommentar an.
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
      {
        key: OnboardingStepKey.EventsBriefing,
        title: "Das Briefing",
        content: () => (
          <>
            <p>
              Viele Events haben ein eigenes kleines Wiki: das Briefing. Du
              findest es als eigenen Tab auf der Eventseite.
            </p>

            <p className="mt-2">
              Dort dokumentieren die Organisatoren den Ablauf und alles Weitere,
              was du für das Event wissen musst.
            </p>

            <OnboardingStepScreenshot
              source={eventBriefingScreenshot}
              alternativeText="Der Briefing-Tab eines Events mit einer Beispielseite"
            />
          </>
        ),
      },
      {
        key: OnboardingStepKey.EventsLineup,
        title: "Die Aufstellung",
        content: () => (
          <>
            <p>
              Bei Events mit Aufstellung siehst du alle Posten und wer sie
              übernimmt. Nach deiner Anmeldung kannst du dich dort auf offene
              Posten bewerben.
            </p>

            <p className="mt-2">
              Halte deine Flotte aktuell, damit du für Posten mit
              Schiffsanforderungen infrage kommst. Wie das funktioniert,
              erfährst du in der Tour zum Flottenmanagement.
            </p>

            <OnboardingStepScreenshot
              source={eventLineupScreenshot}
              alternativeText="Die Aufstellung eines Events mit drei Posten und den zugeteilten Citizens"
            />
          </>
        ),
      },
    ],
  },
  {
    key: OnboardingTaskKey.Fleet,
    title: "Lerne unser Flottenmanagement kennen",
    description: "Füge deine Schiffe zu unserer Flotte hinzu",
    requiredPermissionStrings: ["ship;manage"],
    steps: [
      {
        key: OnboardingStepKey.FleetIntroduction,
        title: "Warum Flottenmanagement?",
        content: () => (
          <>
            <p>
              In der Flotten-App hinterlegst du die Schiffe, die du besitzt. Auf
              dieser Grundlage planen wir die Aufstellungen für unsere Events.
            </p>

            <p className="mt-2">
              Halte deine Schiffe deshalb am besten immer aktuell – so wissen
              wir, mit welchen Schiffen wir rechnen können.
            </p>
          </>
        ),
      },
      {
        key: OnboardingStepKey.FleetAddShips,
        title: "Füge deine Schiffe hinzu",
        route: "/app/fleet/my-ships",
        targetId: OnboardingTargetId.FleetAddShip,
        content: () => (
          <>
            <p>
              Über „Hinzufügen“ fügst du ein Schiff zu deiner Flotte hinzu.
              Wähle das Modell aus und vergib optional einen Namen.
            </p>

            <p className="mt-2">
              Füge am besten direkt nach der Tour deine ersten Schiffe hinzu.
            </p>
          </>
        ),
      },
      {
        key: OnboardingStepKey.FleetOrgFleet,
        title: "Die Org-Flotte",
        route: "/app/fleet/org",
        targetId: OnboardingTargetId.OrgFleet,
        requiredPermissionStrings: ["orgFleet;read"],
        content: () => (
          <p>
            Hier siehst du unsere gesamte Org-Flotte – alle Schiffe, die
            Mitglieder beigesteuert haben. Deine Schiffe zählen dazu, sobald du
            sie hinzugefügt hast.
          </p>
        ),
      },
    ],
  },
  {
    key: OnboardingTaskKey.BrowserNotifications,
    title: "Aktiviere Browserbenachrichtigungen",
    description: "Erhalte Benachrichtigungen direkt in deinem Browser",
    steps: [
      {
        key: OnboardingStepKey.NotificationsIntroduction,
        title: "Benachrichtigungen des SAM",
        content: () => (
          <>
            <p>
              Das SAM verschickt Benachrichtigungen, zum Beispiel zu neuen
              Events oder wenn dich jemand im Wiki erwähnt.
            </p>

            <p className="mt-2">
              Mit Browserbenachrichtigungen erhältst du sie sofort – auch wenn
              die App gerade nicht geöffnet ist.
            </p>
          </>
        ),
      },
      {
        key: OnboardingStepKey.NotificationsEnable,
        title: "Aktiviere die Benachrichtigungen",
        route: "/app/account/notifications",
        targetId: OnboardingTargetId.NotificationsEnable,
        content: () => (
          <>
            <p>
              Klicke auf „Genehmigung anfordern“ und erlaube die
              Benachrichtigungen in deinem Browser.
            </p>

            <p className="mt-2">
              Weiter unten auf der Seite kannst du bei Bedarf einzelne
              Benachrichtigungsarten abwählen.
            </p>
          </>
        ),
      },
    ],
  },
  {
    key: OnboardingTaskKey.AvatarCreator,
    title: "Erstelle dir einen Sinister-Avatar",
    description: "Verziere deinen Avatar mit dem Sinister-Rahmen",
    steps: [
      {
        key: OnboardingStepKey.AvatarCreatorIntroduction,
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
              Den fertigen Avatar kannst du zum Beispiel als Profilbild auf
              unserem Discord-Server verwenden.
            </p>
          </>
        ),
      },
      {
        key: OnboardingStepKey.AvatarCreatorCreate,
        title: "Erstelle deinen Avatar",
        route: "/app/avatar-creator",
        targetId: OnboardingTargetId.AvatarCreator,
        content: () => (
          <p>
            Lade hier dein Bild hoch, wähle eine Hintergrundfarbe und
            positioniere das Bild im Rahmen. Über „Herunterladen“ speicherst du
            das Ergebnis.
          </p>
        ),
      },
    ],
  },
  {
    key: OnboardingTaskKey.Profile,
    title: "Vervollständige dein Profil",
    description: "Hinterlege deine Zeitzone und deinen Geburtstag",
    steps: [
      {
        key: OnboardingStepKey.ProfileComplete,
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
    ],
  },
];

export const getOnboardingTaskByKey = (taskKey: OnboardingTaskKey) =>
  ONBOARDING_TASKS.find((task) => task.key === taskKey);
