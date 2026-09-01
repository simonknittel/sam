import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the template heading and the tab navigation around a subpage that does
 * not exist. A rejection by the layout itself — an unknown or invisible
 * template — still renders the full-page 404.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
