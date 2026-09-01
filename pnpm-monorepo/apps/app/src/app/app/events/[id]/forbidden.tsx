import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * Keeps the event heading and the tab navigation around a subpage the reader
 * may not see, so a rejected tab does not throw them out of the event.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
