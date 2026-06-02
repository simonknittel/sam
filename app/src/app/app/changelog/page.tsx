import { requireAuthenticationPage } from "@/modules/auth/server";
import { getChangelogYears } from "@/modules/changelog/queries/getChangelogYears";
import { notFound, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/iam");

  const years = await getChangelogYears();
  if (!years[0]) notFound();

  const latestYear = years[0];

  redirect(`/app/changelog/${latestYear}`);
}
