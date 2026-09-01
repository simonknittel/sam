import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the briefing sidebar — and with it the event navigation above it —
 * around a missing briefing page, matching the wiki.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
