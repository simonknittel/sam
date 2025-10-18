import { requireAuthenticationPage } from "@/modules/auth/server";
import { Flow } from "@/modules/career/components/Flow";
import { getMyReadableFlows } from "@/modules/career/queries";
import { getCitizensGroupedByVisibleRoles } from "@/modules/citizen/queries";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getRoles } from "@/modules/roles/queries";
import {
  getMyAssignedRoles,
  getVisibleRoles,
} from "@/modules/roles/utils/getRoles";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    flowId: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const flowId = (await props.params).flowId;
    const flows = await getMyReadableFlows();
    const flow = flows.find((flow) => flow.id === flowId);
    if (!flow) notFound();

    return {
      title: `${flow.name}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/career/[flowId]">) {
  const { flowId } = await params;

  const authentication = await requireAuthenticationPage("/app/career");
  await authentication.authorizePage("career", "read", [
    {
      key: "flowId",
      value: flowId,
    },
  ]);

  const flows = await getMyReadableFlows();
  const flow = flows.find((flow) => flow.id === flowId);
  if (!flow) notFound();

  const canUpdate = await authentication.authorize("career", "update", [
    {
      key: "flowId",
      value: flowId,
    },
  ]);

  const isUpdating =
    canUpdate && (await cookies()).get("is_updating_flow")?.value === flowId;

  const [roles, assignedRoles, citizensGroupedByVisibleRoles] =
    await Promise.all([
      isUpdating ? getRoles() : getVisibleRoles(),
      getMyAssignedRoles(),
      getCitizensGroupedByVisibleRoles(),
    ]);

  const additionalData = {
    roles,
    assignedRoles,
    citizensGroupedByVisibleRoles,
  };

  return (
    <SuspenseWithErrorBoundaryTile className="h-[calc(100dvh-64px-48px)] lg:h-[calc(100dvh-104px)]">
      <div className="h-[calc(100dvh-64px-48px)] lg:h-[calc(100dvh-104px)] bg-neutral-800/50 rounded-primary overflow-hidden text-black relative">
        <Flow
          flow={flow}
          canUpdate={canUpdate}
          isUpdating={isUpdating}
          additionalData={additionalData}
        />
      </div>
    </SuspenseWithErrorBoundaryTile>
  );
}
