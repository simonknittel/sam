import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the briefing sidebar around a briefing page that does not exist. The
 * template navigation above the sidebar also stays. This is the behavior of
 * the wiki.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
