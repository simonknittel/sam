import accountScreenshot from "@/modules/account/assets/screenshot.png";
import avatarCreatorScreenshot from "@/modules/avatar-creator/assets/screenshot.png";
import careerScreenshot from "@/modules/career/assets/screenshot.png";
import changelogScreenshot from "@/modules/changelog/assets/screenshot.png";
import cornerstoneImageBrowserScreenshot from "@/modules/cornerstone-image-browser/assets/screenshot.png";
import dashboardScreenshot from "@/modules/dashboard/assets/screenshot.png";
import documentsScreenshot from "@/modules/documents/assets/screenshot.png";
import dogfightTrainerScreenshot from "@/modules/dogfight-trainer/assets/screenshot.png";
import eventsScreenshot from "@/modules/events/assets/screenshot.png";
import fleetScreenshot from "@/modules/fleet/assets/screenshot.png";
import iamScreenshot from "@/modules/iam/assets/screenshot.png";
import logAnalyzerScreenshot from "@/modules/log-analyzer/assets/screenshot.png";
import penaltyPointsScreenshot from "@/modules/penalty-points/assets/screenshot.png";
import profitDistributionScreenshot from "@/modules/profit-distribution/assets/screenshot.png";
import silcScreenshot from "@/modules/silc/assets/screenshot.png";
import spynetScreenshot from "@/modules/spynet/assets/screenshot.png";
import tasksScreenshot from "@/modules/tasks/assets/screenshot.png";
import timezonesScreenshot from "@/modules/timezones/assets/screenshot.png";
import wikiScreenshot from "@/modules/wiki/assets/screenshot.png";
import type { IntegratedApp } from "./types";

export const INTEGRATED_APPS: IntegratedApp[] = [
  {
    name: "Account",
    slug: "account",
    href: "/app/account",
    imageSrc: accountScreenshot,
    description: "Einstellungen zu deinem Account",
  },
  {
    name: "Avatar Creator",
    slug: "avatar-creator",
    href: "/app/avatar-creator",
    imageSrc: avatarCreatorScreenshot,
    description:
      "Verziere deinen Avatar mit dem offiziellen Sinister Incorporated-Rahmen",
  },
  {
    name: "Changelog",
    slug: "changelog",
    href: "/app/changelog",
    imageSrc: changelogScreenshot,
    description: "Übersicht der letzten Änderungen im SAM",
  },
  {
    name: "Cornerstone Image Browser",
    slug: "cornerstone-image-browser",
    href: "/app/tools/cornerstone-image-browser",
    imageSrc: cornerstoneImageBrowserScreenshot,
    description:
      "Stellt die Bilder von Cornerstone nebeneinander dar, um sie visuell einfach vergleichen zu können.",
    tags: ["fun"],
  },
  {
    name: "Dashboard",
    slug: "dashboard",
    href: "/app/dashboard",
    imageSrc: dashboardScreenshot,
    description: "Übersicht mit aktuellen Informationen",
    tags: ["featured"],
  },
  {
    name: "Dogfight Trainer",
    slug: "dogfight-trainer",
    href: "/app/dogfight-trainer",
    imageSrc: dogfightTrainerScreenshot,
    description:
      "Zeige deinen Dogfight Skill in unserer Hommage an den Klassiker, Asteroids. Achte darauf was du abschießt!",
    tags: ["fun"],
  },
  {
    name: "Dokumente",
    slug: "documents",
    href: "/app/documents",
    imageSrc: documentsScreenshot,
    description: "Alles was du zu deinem nächsten Zertifikat wissen möchtest",
    tags: ["featured"],
  },
  {
    name: "Events",
    slug: "events",
    href: "/app/events",
    imageSrc: eventsScreenshot,
    description: "Übersicht aller anstehenden und vergangenen Events",
    tags: ["featured"],
    permissionStrings: ["event;read"],
  },
  {
    name: "Flotte",
    slug: "fleet",
    href: "/app/fleet",
    imageSrc: fleetScreenshot,
    description:
      "Verwalte deine Schiffe und erhalte eine Übersicht über unsere Org-Flotte",
    tags: ["featured"],
    permissionStrings: ["ship;manage", "orgFleet;read"],
  },
  {
    name: "SINcome",
    slug: "sincome",
    href: "/app/sincome",
    imageSrc: profitDistributionScreenshot,
    description: "Mit SINcome machst du deine SILC zu Geld",
    tags: ["featured", "economics"],
    permissionStrings: ["profitDistributionCycle;read"],
  },
  {
    name: "IAM",
    slug: "iam",
    href: "/app/iam",
    imageSrc: iamScreenshot,
    description: "Übersicht und Verwaltung der Rollen und Benutzer.",
    permissionStrings: ["role;manage", "user;read"],
  },
  {
    name: "Karriere",
    slug: "career",
    href: "/app/career",
    imageSrc: careerScreenshot,
    description:
      "Org-interner Karrierebaum in unseren Bereichen Security und Economics",
    tags: ["featured", "security", "economics"],
    permissionStrings: [
      "career;read;flowId=security",
      "career;read;flowId=economic",
      "career;read;flowId=management",
      "career;read;flowId=team",
    ],
  },
  {
    name: "Log Analyzer",
    slug: "log-analyzer",
    href: "/app/tools/log-analyzer",
    imageSrc: logAnalyzerScreenshot,
    description:
      "Wertet die Game Logs von Star Citizen aus um wichtige Ereignisse zu erkennen.",
    tags: ["security"],
    permissionStrings: ["logAnalyzer;read"],
  },
  {
    name: "SILC",
    slug: "silc",
    href: "/app/silc",
    imageSrc: silcScreenshot,
    description: "Übersicht und Verwaltung von SILC",
    tags: ["economics"],
    permissionStrings: ["silcBalanceOfOtherCitizen;read"],
  },
  {
    name: "Statistiken",
    slug: "statistics",
    href: "/app/statistics",
    description: "Diverse Statistiken zur Nutzung vom SAM",
    permissionStrings: ["globalStatistics;read"],
  },
  {
    name: "Spynet",
    slug: "spynet",
    href: "/app/spynet",
    imageSrc: spynetScreenshot,
    description: "Übersicht und Verwaltung von Citizen und Organisations",
    tags: ["featured", "security"],
    permissionStrings: ["citizen;read", "organization;read"],
  },
  {
    name: "Strafpunkte",
    slug: "penalty-points",
    href: "/app/penalty-points",
    imageSrc: penaltyPointsScreenshot,
    description: "Übersicht und Verwaltung von Strafpunkten",
    permissionStrings: ["penaltyEntry;create"],
  },
  {
    name: "System Log",
    slug: "system-log",
    href: "/app/system-log",
    description: "Systemprotokoll aller Ereignisse",
    permissionStrings: ["systemLog;read"],
  },
  {
    name: "Tasks",
    slug: "tasks",
    href: "/app/tasks",
    imageSrc: tasksScreenshot,
    description: "Org-internes Quest System",
    tags: ["featured"],
    permissionStrings: ["task;read"],
  },
  {
    name: "Timezones",
    slug: "timezones",
    href: "/app/timezones",
    imageSrc: timezonesScreenshot,
    description:
      "Helfer für die Umrechnung von Zeiten zwischen verschiedenen Zeitzonen",
  },
  {
    name: "Uploads",
    slug: "uploads",
    href: "/app/uploads",
    description:
      "Übersicht der von dir hochgeladenen Dateien und wo sie verwendet werden",
  },
  {
    name: "Wiki",
    slug: "wiki",
    href: "/app/wiki",
    imageSrc: wikiScreenshot,
    description: "Das Wissen der Organisation an einem Ort",
    tags: ["featured"],
  },
];
