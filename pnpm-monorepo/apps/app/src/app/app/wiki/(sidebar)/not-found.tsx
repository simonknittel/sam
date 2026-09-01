import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the wiki chrome — above all the sidebar's table of contents — around a
 * missing page, so a dead link does not throw the reader out of the wiki.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
