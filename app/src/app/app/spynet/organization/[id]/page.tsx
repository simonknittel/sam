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

type Params = Promise<
  Readonly<{
    id: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const organization = await getOrganization((await props.params).id);
    if (!organization) return {};

    return {
      title: `${organization.name}`,
    };
  },
);

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/organization/[id]",
  );
  await authentication.authorizePage("organization", "read");

  const params = await props.params;

  const organization = await getOrganization(params.id);
  if (!organization) notFound();

  return (
    <MaxWidthContent>
      <div className="flex gap-2 font-bold text-xl">
        <Link
          href="/app/spynet"
          className="text-neutral-500 flex gap-1 items-center hover:text-neutral-300"
        >
          Spynet
        </Link>

        <span className="text-neutral-500">/</span>

        <span className="text-neutral-500 flex gap-1 items-center">
          Organisation
        </span>

        <span className="text-neutral-500">/</span>

        <h1 className="overflow-hidden text-ellipsis whitespace-nowrap">
          {organization.name}
        </h1>

        {/* {authentication.authorize("organization", "delete") && <DeleteEntity entity={organization} />} */}
      </div>

      <div className="mt-4 flex flex-col 3xl:flex-row-reverse gap-8">
        <div className="flex flex-col gap-4 md:flex-row 3xl:w-[720px]">
          <SuspenseWithErrorBoundaryTile className="md:w-1/2 3xl:self-start">
            <OverviewTile className="md:w-1/2 3xl:self-start" id={params.id} />
          </SuspenseWithErrorBoundaryTile>

          <SuspenseWithErrorBoundaryTile className="md:w-1/2 3xl:self-start">
            <MembershipsTile
              className="md:w-1/2 3xl:self-start"
              id={params.id}
            />
          </SuspenseWithErrorBoundaryTile>
        </div>

        <SuspenseWithErrorBoundaryTile className="flex-1">
          <ActivityTile className="flex-1 3xl:self-start" id={params.id} />
        </SuspenseWithErrorBoundaryTile>
      </div>
    </MaxWidthContent>
  );
}
