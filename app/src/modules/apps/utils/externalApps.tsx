import siloAnfrageScreenshot from "@/assets/silo-anfrage-screenshot.png";
import { AiOutlineForm } from "react-icons/ai";
import { FaShoppingBasket } from "react-icons/fa";
import { FaBarsProgress } from "react-icons/fa6";
import type { ExternalApp } from "./types";

export const externalApps: ExternalApp[] = [
  {
    id: "cmfavc1fu0000eo9v2ff6bfh2",
    name: "SILO-Anfrage",
    slug: "silo-request",
    icon: <AiOutlineForm />,
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
    icon: <FaShoppingBasket />,
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

  {
    id: "dicld2d3ciqvi3fs6i5jxw60",
    name: "Projekte",
    slug: "projects",
    icon: <FaBarsProgress />,
    description: "Verfolge den Fortschritt unserer Org-internen Projekte",
    tags: ["economics"],
    defaultPage: {
      iframeUrl:
        "https://script.google.com/macros/s/AKfycbwDnz0ooW3_sTLz-y7zSJsNJMyEbzpm-2BdJnmSNCdr9Rxk8171Z60Xj5ACgqNCnlEjrg/exec",
    },
    team: [
      {
        handle: "GeronBraginson",
      },
      {
        handle: "Redilian",
      },
    ],
  },
];
