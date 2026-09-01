import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * Keeps the event heading and the tab navigation around a subpage that the
 * reader must not see. The reader stays in the event.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
