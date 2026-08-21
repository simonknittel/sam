import { requireAuthenticationPage } from "@/modules/auth/server";
import { getMyReadableFlows } from "@/modules/career/queries/getMyReadableFlows";
import { log } from "@/modules/logging";
import { forbidden, redirect } from "next/navigation";

/**
 * The career app has no landing page of its own: it sends visitors to the
 * first flow they may read. Managers without a single readable flow — which
 * cannot happen while `career;manage` grants read on every flow, but does
 * once no flow exists at all — land in the management UI instead.
 */
export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/career");

  const flows = await getMyReadableFlows();
  const firstReadableFlow = flows[0];
  if (firstReadableFlow) redirect(`/app/career/${firstReadableFlow.slug}`);

  if (await authentication.authorize("career", "manage"))
    redirect("/app/career/settings");

  log.info("Forbidden request to page", {
    requestPath: "/app/career",
    userId: authentication.session.user.id,
    reason: "Insufficient permissions",
  });

  forbidden();
}
