"use client";

import type { WikiNodeAlignment } from "@sam-monorepo/wiki-editor";
import { FaAlignCenter, FaAlignLeft, FaAlignRight } from "react-icons/fa";

export const ALIGNMENT_OPTIONS: readonly {
  value: WikiNodeAlignment;
  title: string;
  icon: typeof FaAlignLeft;
}[] = [
  { value: "left", title: "Linksbündig", icon: FaAlignLeft },
  { value: "center", title: "Zentriert", icon: FaAlignCenter },
  { value: "right", title: "Rechtsbündig", icon: FaAlignRight },
];
