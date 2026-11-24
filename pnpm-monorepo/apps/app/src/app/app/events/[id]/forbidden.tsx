import { ForbiddenCard } from "@/modules/common/components/ForbiddenCard";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

/** Keeps the event heading and the tabs around the 403 */
export default function Forbidden() {
  return <ForbiddenCard />;
}
