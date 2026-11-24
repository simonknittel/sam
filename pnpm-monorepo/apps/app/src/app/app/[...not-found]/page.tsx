import { type Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * From Next.js documentation:
 * > In addition to catching expected `notFound()` errors, the root
 * `app/not-found.js` file also handles any unmatched URLs for your whole
 * application
 *
 * That means, that a nested `not-found.tsx` file does not handle unmatched
 * URLs. Instead we need to use a workaround by leveraging a catch-all route
 * (`[...not-found]/page.tsx`)
 */

export const metadata: Metadata = {
  title: "404 Not Found",
};

/** No gate: the page loads no data and only answers with a 404 */
export default function Page() {
  notFound();
}
