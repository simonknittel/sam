import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * Keeps the template heading and the tab navigation around a subpage the
 * reader may not see.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
