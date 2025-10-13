import { type Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * From Next.js documentation:
 * > In addition to catching expected `notFound()` errors, the root
 * `app/not-found.js` file also handles any unmatched URLs for your whole
 * application
 *
 * That means, that we can't have nested `not-found.tsx` files. Instead we need
 * to use a workaround by leveraging a catch-all router
 * (`[[...not-found]]/page.tsx`)
 */

export const metadata: Metadata = {
  title: "404 - Page not found",
};

export default function Page() {
  notFound();
}
