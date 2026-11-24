import { requireAuthenticationPage } from "@/modules/auth/server";
import { getMyReadableFlows } from "@/modules/career/queries/getMyReadableFlows";
import { log } from "@/modules/logging";
import { forbidden, redirect } from "next/navigation";

/**
 * Without a readable flow, a manager goes to the settings. That occurs only
 * while no flow exists, because `career;manage` gives read on each flow.
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
