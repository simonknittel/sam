import { getExternalAppBySlug } from "@/modules/apps/utils/queries";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { RichText } from "@/modules/common/components/RichText";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { notFound } from "next/navigation";

type Params = Promise<{
  appSlug: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const { appSlug } = await props.params;
    const app = await getExternalAppBySlug(appSlug);
    if (!app) notFound();

    return {
      title: `Info - ${app.name}`,
      description: app.description || undefined,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/external/[appSlug]/info">) {
  await requireAuthenticationPage("/app/external/[appSlug]/info");

  const { appSlug } = await params;
  const app = await getExternalAppBySlug(appSlug);
  if (!app) notFound();

  return (
    <MaxWidthContent maxWidth="prose">
      <section className="background-secondary rounded-primary p-4">
        <h1 className="sr-only">Info</h1>

        <RichText>
          <h2>Hinweis</h2>
          <p>
            Diese App wird extern entwickelt und betrieben. Bei Fragen oder
            Problemen, melde dich bitte bei dem verantwortlichen Team.
          </p>
          <p>
            Wenn das verantwortliche Team nicht weiterhelfen kann, melde dich im
            Zweifel beim Support des SAM (siehe{" "}
            <Link href="/app/help/support">Hilfe &gt; Support</Link>).
          </p>

          <h2>Team</h2>
          <ul>
            {app.team.map((member) => (
              <li key={member.handle}>{member.handle}</li>
            ))}
          </ul>
        </RichText>
      </section>
    </MaxWidthContent>
  );
}
