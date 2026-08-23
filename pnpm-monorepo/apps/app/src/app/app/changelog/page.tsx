import { requireAuthenticationPage } from "@/modules/auth/server";
import { getChangelogQuarters } from "@/modules/changelog/queries/getChangelogQuarters";
import { notFound, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/iam");

  const quarters = await getChangelogQuarters();
  const latestQuarter = quarters[0];
  if (!latestQuarter) notFound();

  redirect(`/app/changelog/${latestQuarter.slug}`);
}
