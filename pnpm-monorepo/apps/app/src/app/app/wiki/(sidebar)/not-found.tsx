import { Hero } from "@/modules/common/components/Hero";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the wiki chrome — above all the sidebar's table of contents — around a
 * missing page, so a dead link does not throw the reader out of the wiki.
 */
export default function NotFound() {
  return (
    <article className="bg-secondary rounded-primary p-8 flex flex-col items-center gap-4">
      <Hero text="404" size="md" withGlitch />

      <p>Page not found</p>
    </article>
  );
}
