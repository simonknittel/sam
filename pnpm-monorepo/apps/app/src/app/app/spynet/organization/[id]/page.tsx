import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { ActivityTile } from "@/modules/organizations/components/ActivityTile";
import { MembershipsTile } from "@/modules/organizations/components/MembershipsTile";
import { OverviewTile } from "@/modules/organizations/components/OverviewTile";
import { notFound } from "next/navigation";
import { cache } from "react";

const getOrganization = cache(async (id: string) => {
  return prisma.organization.findUnique({
    where: {
      id,
    },
    select: {
      name: true,
    },
  });
});

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/spynet/organization/[id]">) => {
    const organization = await getOrganization((await props.params).id);
    if (!organization) return {};

    return {
      title: `${organization.name}`,
    };
  },
);

export default async function Page(
  props: PageProps<"/app/spynet/organization/[id]">,
) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/organization/[id]",
  );
  await authentication.authorizePage("organization", "read");

  const params = await props.params;

  const organization = await getOrganization(params.id);
  if (!organization) notFound();

  return (
    <MaxWidthContent>
      <div className="flex gap-2 text-xl font-bold">
        <Link
          href="/app/spynet"
          className="flex items-center gap-1 text-neutral-500 hover:text-neutral-300"
        >
          Spynet
        </Link>

        <span className="text-neutral-500">/</span>

        <span className="flex items-center gap-1 text-neutral-500">
          Organisation
        </span>

        <span className="text-neutral-500">/</span>

        <h1 className="truncate" title={organization.name}>
          {organization.name}
        </h1>
      </div>

      <div className="mt-4 flex flex-col gap-8 3xl:flex-row-reverse">
        <div className="flex flex-col gap-4 3xl:w-180 md:flex-row">
          <SuspenseWithErrorBoundaryTile className="3xl:self-start md:w-1/2">
            <OverviewTile className="3xl:self-start md:w-1/2" id={params.id} />
          </SuspenseWithErrorBoundaryTile>

          <SuspenseWithErrorBoundaryTile className="3xl:self-start md:w-1/2">
            <MembershipsTile
              className="3xl:self-start md:w-1/2"
              id={params.id}
            />
          </SuspenseWithErrorBoundaryTile>
        </div>

        <SuspenseWithErrorBoundaryTile className="flex-1">
          <ActivityTile
            className="flex-1 3xl:self-start"
            id={params.id}
            searchParams={props.searchParams}
          />
        </SuspenseWithErrorBoundaryTile>
      </div>
    </MaxWidthContent>
  );
}
