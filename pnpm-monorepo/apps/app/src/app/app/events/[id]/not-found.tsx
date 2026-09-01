import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the event heading and the tab navigation around a subpage that does
 * not exist. The reader can go to a different tab. If the layout rejects the
 * request, for example for an unknown event, the app shows the full-page 404.
 * There is no event name to show in that condition.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
