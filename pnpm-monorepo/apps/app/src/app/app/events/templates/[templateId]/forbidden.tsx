import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * Keeps the template heading and the tab navigation around a subpage that the
 * reader must not see.
 *
 * No page below this segment sends a 403 at this time. The template routes
 * hide a rejection behind a 404. This boundary makes sure that a new 403
 * keeps the chrome, as it does in the event routes.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
