import { getExternalAppBySlug } from "@/modules/apps/utils/queries/getExternalAppBySlug";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { RichText } from "@/modules/common/components/RichText";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getWikiPageLinkTarget } from "@/modules/wiki/queries/getWikiSettings";
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
      title: `Über diese App - ${app.name}`,
      description: app.description || undefined,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/external/[appSlug]/about">) {
  await requireAuthenticationPage("/app/external/[appSlug]/about");

  const { appSlug } = await params;
  const [app, supportTarget] = await Promise.all([
    getExternalAppBySlug(appSlug),
    getWikiPageLinkTarget("support"),
  ]);
  if (!app) notFound();

  return (
    <MaxWidthContent maxWidth="prose">
      <section className="bg-secondary rounded-primary p-4">
        <h1 className="sr-only">Über diese App</h1>

        <RichText>
          <h2>Externe App</h2>

          <p>
            Diese App wird außerhalb des SAM entwickelt und betrieben. Das SAM
            hat keinen Einfluss auf die Funktionalität oder Korrektheit der
            Inhalte.
          </p>

          <p>
            Bei Fragen oder Problemen, melde dich bei dem verantwortlichen Team.
          </p>

          <p>
            Wenn das Team nicht weiterhelfen kann, melde dich im Zweifel beim
            Support des SAM
            {supportTarget && (
              <>
                {" "}
                (siehe <Link href={supportTarget.href}>Support</Link>)
              </>
            )}
            .
          </p>

          <h2>Verantwortliche</h2>

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
