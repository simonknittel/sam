import { NotFoundCard } from "@/modules/common/components/NotFoundCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

/**
 * Keeps the template heading and the tab navigation around a subpage that does
 * not exist. If the layout rejects the request, for example for an unknown or
 * an invisible template, the app shows the full-page 404.
 */
export default function NotFound() {
  return <NotFoundCard />;
}
