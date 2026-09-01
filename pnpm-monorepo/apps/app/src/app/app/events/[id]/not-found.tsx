import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the event heading and the tab navigation around a subpage that does
 * not exist, so the reader can switch to another tab instead of landing on a
 * full-page 404. A rejection by the layout itself — an unknown event — still
 * renders the full-page 404, because there is no event name to show then.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
