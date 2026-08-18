import { requireAuthenticationPage } from "@/modules/auth/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uploads",
};

/**
 * Deliberately no `authorizePage`: everyone may see their own uploads. The
 * `upload;manage` permission widens the scope inside the query instead of
 * gating the route (see getUploads).
 */
export default async function Page() {
  await requireAuthenticationPage("/app/uploads");

  return null;
}
