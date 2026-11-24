import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the template heading and the tabs around the 404. When the layout
 * rejects the request, the app shows the full-page 404.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
