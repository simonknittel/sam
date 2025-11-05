import { env } from "@/env";
import { requireAuthentication } from "@/modules/auth/server";
import srcA1 from "@/modules/documents/assets/a1.svg";
import srcA2 from "@/modules/documents/assets/a2.svg";
import srcA3 from "@/modules/documents/assets/a3.svg";
import srcAdvancedDogfight from "@/modules/documents/assets/advancedDogfight.svg";
import srcAlliance from "@/modules/documents/assets/alliance.svg";
import srcBombardment from "@/modules/documents/assets/bombardment.svg";
import srcBootsOnTheGround from "@/modules/documents/assets/bootsOnTheGround.svg";
import srcCaptainOnTheBridge from "@/modules/documents/assets/captainOnTheBridge.svg";
import srcDogfight from "@/modules/documents/assets/dogfight.svg";
import srcEngineering from "@/modules/documents/assets/engineering.svg";
import srcFrontline from "@/modules/documents/assets/frontline.svg";
import srcHandsOnDeck from "@/modules/documents/assets/handsOnDeck.svg";
import srcInterdictAndDisable from "@/modules/documents/assets/interdictAndDisable.svg";
import srcLeadership from "@/modules/documents/assets/leadership.svg";
import srcLeadThePack from "@/modules/documents/assets/leadThePack.svg";
import srcManager from "@/modules/documents/assets/manager.svg";
import srcMarketeer from "@/modules/documents/assets/marketeer.svg";
import srcMember from "@/modules/documents/assets/member.svg";
import srcMining from "@/modules/documents/assets/mining.svg";
import srcMissiles from "@/modules/documents/assets/missiles.svg";
import srcOnboarding from "@/modules/documents/assets/onboarding.svg";
import srcPolaris from "@/modules/documents/assets/polaris.svg";
import srcRecon from "@/modules/documents/assets/recon.svg";
import srcSalvage from "@/modules/documents/assets/salvage.svg";
import srcScavenger from "@/modules/documents/assets/scavenger.svg";
import srcSupervisor from "@/modules/documents/assets/supervisor.svg";
import srcTechAndTactic from "@/modules/documents/assets/techAndTactic.svg";
import srcTradeAndTransport from "@/modules/documents/assets/tradeAndTransport.svg";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

interface Document {
  name: string;
  slug: string;
  src: string;
  href: string;
}

interface Category {
  name: string;
  documents: Document[];
}

const categories: Category[] = [
  {
    name: "Basics",
    documents: [
      {
        name: "Alliance",
        slug: "alliance",
        src: srcAlliance,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}/fJ4JG5QbTnHYLp5`,
      },
      {
        name: "Onboarding",
        slug: "onboarding",
        src: srcOnboarding,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}7gZRw8y93aE3Nky`,
      },
      {
        name: "A1",
        slug: "a1",
        src: srcA1,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/a1.pdf`,
      },
      {
        name: "A2",
        slug: "a2",
        src: srcA2,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/a2.pdf`,
      },
      {
        name: "A3",
        slug: "a3",
        src: srcA3,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}XwpDeR2dyyKA8Sm`,
      },
      {
        name: "Member",
        slug: "member",
        src: srcMember,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}o5Cydra6B7rtgRK`,
      },
    ],
  },

  {
    name: "Abilities",
    documents: [
      {
        name: "Recon",
        slug: "recon",
        src: srcRecon,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}Y9cY4dJ5AyJqKty`,
      },
      {
        name: "Dogfight",
        slug: "dogfight",
        src: srcDogfight,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/dogfight.pdf`,
      },
      {
        name: "Advanced Dogfight",
        slug: "advanced-dogfight",
        src: srcAdvancedDogfight,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/advanced-dogfight.pdf`,
      },
      {
        name: "Hands On Deck",
        slug: "hands-on-deck",
        src: srcHandsOnDeck,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}wxDGfB7LKHG52Q4`,
      },
      {
        name: "Engineering",
        slug: "engineering",
        src: srcEngineering,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/engineering.pdf`,
      },
      {
        name: "Boots On The Ground",
        slug: "boots-on-the-ground",
        src: srcBootsOnTheGround,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}JgP6Aj8Qgyfg8QH`,
      },
      {
        name: "Captain On The Bridge",
        slug: "captain-on-the-bridge",
        src: srcCaptainOnTheBridge,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/captain-on-the-bridge.pdf`,
      },
      {
        name: "Missiles",
        slug: "missiles",
        src: srcMissiles,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/missiles.pdf`,
      },
      {
        name: "Bombardment",
        slug: "bombardment",
        src: srcBombardment,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/bombardment.pdf`,
      },
      {
        name: "Interdict & Disable",
        slug: "interdict-and-disable",
        src: srcInterdictAndDisable,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}xCH6dpcisQGqrgq`,
      },
    ],
  },

  {
    name: "Lead",
    documents: [
      {
        name: "Leadership",
        slug: "leadership",
        src: srcLeadership,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}LCwBaiFBdj3B6fz`,
      },
      {
        name: "Tech & Tactic",
        slug: "tech-and-tactic",
        src: srcTechAndTactic,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/tech&tactic.pdf`,
      },
      {
        name: "Frontline",
        slug: "frontline",
        src: srcFrontline,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/frontline.pdf`,
      },
      {
        name: "Lead The Pack",
        slug: "lead-the-pack",
        src: srcLeadThePack,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/lead-the-pack.pdf`,
      },
      {
        name: "Supervisor",
        slug: "supervisor",
        src: srcSupervisor,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}jBWF7DYkL9xMHpF`,
      },
      {
        name: "Manager",
        slug: "manager",
        src: srcManager,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/manager.pdf`,
      },
    ],
  },

  {
    name: "Eco",
    documents: [
      {
        name: "Salvage",
        slug: "salvage",
        src: srcSalvage,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/salvage.pdf`,
      },
      {
        name: "Mining",
        slug: "mining",
        src: srcMining,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}fRXkXeyfSoY5Xws`,
      },
      {
        name: "Trade & Transport",
        slug: "trade-and-transport",
        src: srcTradeAndTransport,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}EXpqq82JoKTpW2a`,
      },
      {
        name: "Scavenger",
        slug: "scavenger",
        src: srcScavenger,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2}gCaqeqtSjsHxtDx`,
      },
      {
        name: "Marketeer",
        slug: "marketeer",
        src: srcMarketeer,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/marketeer.pdf`,
      },
    ],
  },

  {
    name: "Ship Manuals",
    documents: [
      {
        name: "Polaris",
        slug: "polaris",
        src: srcPolaris,
        href: `${env.NEXT_PUBLIC_DOWNLOADS_BASE_URL}/polaris.pdf`,
      },
    ],
  },
];

export const getDocuments = cache(
  withTrace("getDocuments", async () => {
    const authentication = await requireAuthentication();

    const authorizations = await Promise.all([
      authentication.authorize("documentAlliance", "read"),
      authentication.authorize("documentOnboarding", "read"),
      authentication.authorize("documentA1", "read"),
      authentication.authorize("documentA2", "read"),
      authentication.authorize("documentA3", "read"),
      authentication.authorize("documentMember", "read"),
      authentication.authorize("documentRecon", "read"),
      authentication.authorize("documentDogfight", "read"),
      authentication.authorize("documentAdvancedDogfight", "read"),
      authentication.authorize("documentHandsOnDeck", "read"),
      authentication.authorize("documentEngineering", "read"),
      authentication.authorize("documentBootsOnTheGround", "read"),
      authentication.authorize("documentCaptainOnTheBridge", "read"),
      authentication.authorize("documentMissiles", "read"),
      authentication.authorize("documentBombardment", "read"),
      authentication.authorize("documentInterdictAndDisable", "read"),
      authentication.authorize("documentLeadership", "read"),
      authentication.authorize("documentTechAndTactic", "read"),
      authentication.authorize("documentFrontline", "read"),
      authentication.authorize("documentLeadThePack", "read"),
      authentication.authorize("documentSupervisor", "read"),
      authentication.authorize("documentManager", "read"),
      authentication.authorize("documentSalvage", "read"),
      authentication.authorize("documentMining", "read"),
      authentication.authorize("documentTradeAndTransport", "read"),
      authentication.authorize("documentScavenger", "read"),
      authentication.authorize("documentMarketeer", "read"),
      authentication.authorize("documentPolaris", "read"),
    ]);

    if (authorizations.every((authorization) => authorization === false))
      return [];

    const categoriesWithAuthorizedDocuments: Category[] = [];
    let counter = 0;
    for (const category of categories) {
      const documents = [];
      for (const document of category.documents) {
        if (authorizations[counter]) documents.push(document);
        counter++;
      }
      if (documents.length > 0)
        categoriesWithAuthorizedDocuments.push({ ...category, documents });
    }

    return categoriesWithAuthorizedDocuments;
  }),
);
