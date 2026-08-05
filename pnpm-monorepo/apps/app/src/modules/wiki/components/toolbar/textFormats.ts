"use client";

import type { ChainedCommands } from "@tiptap/core";
import {
  FaBold,
  FaCode,
  FaItalic,
  FaStrikethrough,
  FaUnderline,
} from "react-icons/fa";
import { MdTextDecrease } from "react-icons/md";

export const TEXT_FORMAT_OPTIONS = [
  { name: "bold", title: "Fett", icon: FaBold },
  { name: "italic", title: "Kursiv", icon: FaItalic },
  { name: "underline", title: "Unterstrichen", icon: FaUnderline },
  { name: "strike", title: "Durchgestrichen", icon: FaStrikethrough },
  { name: "wikiSmallText", title: "Kleiner Text", icon: MdTextDecrease },
  { name: "code", title: "Code", icon: FaCode },
] as const;

/**
 * Runs the toggle command for a text format on a prepared chain.
 */
export const toggleWikiTextFormat = (
  chain: ChainedCommands,
  name: (typeof TEXT_FORMAT_OPTIONS)[number]["name"],
) => {
  switch (name) {
    case "bold":
      chain.toggleBold().run();
      break;

    case "italic":
      chain.toggleItalic().run();
      break;

    case "underline":
      chain.toggleUnderline().run();
      break;

    case "strike":
      chain.toggleStrike().run();
      break;

    case "wikiSmallText":
      chain.toggleWikiSmallText().run();
      break;

    case "code":
      chain.toggleCode().run();
      break;

    default:
      throw new Error(`Unknown format: ${name satisfies never}`);
  }
};
