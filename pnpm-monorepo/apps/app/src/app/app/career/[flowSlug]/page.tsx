import { requireAuthenticationPage } from "@/modules/auth/server";
import { Flow } from "@/modules/career/components/Flow";
import { getFlowContext } from "@/modules/career/queries/getFlowContext";
import { getFlowWithNodes } from "@/modules/career/queries/getFlowWithNodes";
import { getCitizensGroupedByVisibleRoles } from "@/modules/citizen/queries/getCitizensGroupedByVisibleRoles";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { log } from "@/modules/logging";
import { getRoles } from "@/modules/roles/queries/getRoles";
import {
  getMyAssignedRoles,
  getVisibleRoles,
} from "@/modules/roles/utils/getRoles";
import { cookies } from "next/headers";
import { forbidden, notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    flowSlug: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const flowSlug = (await props.params).flowSlug;
    const context = await getFlowContext();
    const flow = context?.flowsBySlug.get(flowSlug);
    if (!flow || !context?.permissions.get(flow.id)?.canRead) return {};

    return {
      title: `${flow.name}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/career/[flowSlug]">) {
  const { flowSlug } = await params;
  const requestPath = `/app/career/${flowSlug}`;

  const authentication = await requireAuthenticationPage(requestPath);

  const context = await getFlowContext();
  /** Unknown and soft-deleted slugs alike have no flow to show */
  const flowMetadata = context?.flowsBySlug.get(flowSlug);
  if (!flowMetadata) notFound();

  const permissions = context?.permissions.get(flowMetadata.id);
  if (!permissions?.canRead) {
    log.info("Forbidden request to page", {
      requestPath,
      userId: authentication.session.user.id,
      reason: "Insufficient permissions",
    });

    forbidden();
  }

  const flow = await getFlowWithNodes(flowMetadata.id);
  if (!flow) notFound();

  const canUpdate = permissions.canUpdate;

  /**
   * The edit-mode cookie stores the flow id, not the slug, so it survives a
   * rename.
   */
  const isUpdating =
    canUpdate && (await cookies()).get("is_updating_flow")?.value === flow.id;

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
    <SuspenseWithErrorBoundaryTile className="h-[calc(100dvh-64px-48px)] lg:h-[calc(100dvh-112px)]">
      <div className="h-[calc(100dvh-64px-48px)] lg:h-[calc(100dvh-112px)] bg-neutral-800/50 rounded-primary overflow-hidden text-black relative">
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
