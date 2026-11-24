import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/** Keeps the briefing sidebar around the 404 */
export default function NotFound() {
  return <NotFoundCard />;
}
