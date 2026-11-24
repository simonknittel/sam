import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * `getWikiContext()` never gives null, thus the two `forbidden()` calls below
 * this segment do not fire at this time. The boundary keeps the sidebar around
 * a new 403.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
