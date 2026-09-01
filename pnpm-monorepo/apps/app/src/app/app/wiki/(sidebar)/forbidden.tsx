import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/**
 * Keeps the wiki chrome around a page that the reader must not see.
 *
 * The two `forbidden()` calls below this segment are defensive at this time.
 * They fire only without a session, which `requireAuthenticationPage()`
 * already sends away. This boundary makes sure that a new 403 keeps the
 * chrome, as the 404 next to it does.
 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
