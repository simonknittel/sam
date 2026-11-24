import { type Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * A nested `not-found.tsx` does not handle unmatched URLs. This catch-all route
 * shows it for them.
 */

export const metadata: Metadata = {
  title: "404 Not Found",
};

/** No gate: the page loads no data and only answers with a 404 */
export default function Page() {
  notFound();
}
