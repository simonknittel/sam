import siloAnfrageScreenshot from "@/assets/silo-anfrage-screenshot.png";
import type { ExternalApp } from "./types";

export const externalApps: ExternalApp[] = [
  {
    id: "cmfavc1fu0000eo9v2ff6bfh2",
    name: "SILO-Anfrage",
    slug: "silo-request",
    imageSrc: siloAnfrageScreenshot,
    description:
      "Hier kannst du Materialeinträge anmelden, aktuelle Angebote und Preislisten anfordern.",
    tags: ["featured", "economics"],
    defaultPage: {
      iframeUrl:
        "https://docs.google.com/forms/d/e/1FAIpQLSeHEgpv4GmnZhu7MS2aQc9zgETWQw8tusJ7oaGLsyuHeD1LMw/viewform",
    },
    // pages: [
    //   {
    //     title: "Test",
    //     slug: "test",
    //     iframeUrl:
    //       "https://docs.google.com/forms/d/e/1FAIpQLSeHEgpv4GmnZhu7MS2aQc9zgETWQw8tusJ7oaGLsyuHeD1LMw/viewform?embedded=true",
    //   },
    //   {
    //     title: "In einem neuen Tab öffnen",
    //     externalUrl:
    //       "https://docs.google.com/forms/d/e/1FAIpQLSeHEgpv4GmnZhu7MS2aQc9zgETWQw8tusJ7oaGLsyuHeD1LMw/viewform",
    //   },
    // ],
    createLinks: [
      {
        title: "SILO-Anfrage",
        slug: "",
      },
    ],
    team: [
      {
        handle: "Waffelkeks",
      },
    ],
  },

  {
    id: "mwibr68eokqvhw23c3r7msih",
    name: "Scrapper's Codex",
    slug: "scrappers-codex",
    description:
      "Verkaufe einfach und schnell deinen Loot gewinnbringend über den Schwarzmarkt der Org",
    tags: ["featured", "economics"],
    defaultPage: {
      iframeUrl:
        "https://docs.google.com/spreadsheets/d/1E3F__tz9GuqV8kCtQHpGKmqkjf5Ust7JObf1LwFLhqs",
    },
    team: [
      {
        handle: "Salbei",
      },
      {
        handle: "Waffelkeks",
      },
    ],
  },
];
