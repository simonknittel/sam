import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * No page below this segment sends a 403 at this time: the template routes hide
 * a rejection behind a 404. The boundary keeps the template heading and the
 * tabs around a new 403.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
