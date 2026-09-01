import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * Keeps the wiki chrome around a page the reader may not see, so a rejection
 * does not throw them out of the wiki.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
