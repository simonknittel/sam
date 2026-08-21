import { requireAuthenticationPage } from "@/modules/auth/server";
import { DeleteFlowButton } from "@/modules/career/components/DeleteFlowButton";
import { FlowRoleAccessEditor } from "@/modules/career/components/FlowRoleAccessEditor";
import { RenameFlowForm } from "@/modules/career/components/RenameFlowForm";
import { getManageableFlow } from "@/modules/career/queries/getManageableFlows";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type Params = Promise<
  Readonly<{
    flowId: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const { flowId } = await props.params;
    const flow = await getManageableFlow(flowId);
    if (!flow) return {};

    return { title: flow.name };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/career/settings/[flowId]">) {
  const { flowId } = await params;

  const authentication = await requireAuthenticationPage(
    "/app/career/settings/[flowId]",
  );
  await authentication.authorizePage("career", "manage");

  return (
    <SuspenseWithErrorBoundaryTile>
      <FlowSettings flowId={flowId} />
    </SuspenseWithErrorBoundaryTile>
  );
}

interface FlowSettingsProps {
  readonly flowId: string;
}

const FlowSettings = async ({ flowId }: FlowSettingsProps) => {
  const [flow, visibleRoles] = await Promise.all([
    getManageableFlow(flowId),
    getVisibleRoles(),
  ]);
  if (!flow) notFound();

  const isDeleted = Boolean(flow.deletedAt);

  return (
    <div className="flex flex-col gap-4">
      <Tile heading={flow.name}>
        {isDeleted ? (
          <p className="text-neutral-500">
            Dieser Karrierebaum wurde gelöscht. Er lässt sich in der Übersicht
            über den Filter „Gelöscht“ wiederherstellen; bis dahin sind Name,
            Slug und Berechtigungen nicht änderbar.
          </p>
        ) : (
          <RenameFlowForm flowId={flow.id} name={flow.name} slug={flow.slug} />
        )}
      </Tile>

      {!isDeleted && (
        <Tile heading="Berechtigungen">
          <p className="mb-4 text-sm text-neutral-400">
            „Bearbeiten“ schließt „Lesen“ ein. Nutzer mit der Berechtigung
            „Karrierebäume verwalten“ können jeden Karrierebaum unabhängig
            hiervon lesen und bearbeiten.
          </p>

          <FlowRoleAccessEditor
            flowId={flow.id}
            roleAccess={flow.roleAccess}
            selectableRoles={visibleRoles.map((role) => ({
              id: role.id,
              name: role.name,
            }))}
          />
        </Tile>
      )}

      <Tile heading="Details">
        <dl className="flex flex-col gap-3 text-sm">
          <MetadataRow label="Slug">
            {isDeleted ? (
              <span className="font-mono">{flow.slug}</span>
            ) : (
              <Link
                href={`/app/career/${flow.slug}`}
                className="font-mono text-interaction-500 hover:underline focus-visible:underline active:text-interaction-300"
              >
                /app/career/{flow.slug}
              </Link>
            )}
          </MetadataRow>

          <MetadataRow label="Knoten">{flow._count.nodes}</MetadataRow>

          <MetadataRow label="Erstellt">
            {formatDate(flow.createdAt)} von{" "}
            <CitizenLink citizen={flow.createdBy} />
          </MetadataRow>

          <MetadataRow label="Zuletzt geändert">
            {formatDate(flow.updatedAt)} von{" "}
            <CitizenLink citizen={flow.updatedBy} />
          </MetadataRow>

          {flow.deletedAt && (
            <MetadataRow label="Gelöscht">
              {formatDate(flow.deletedAt)} von{" "}
              <CitizenLink citizen={flow.deletedBy} />
            </MetadataRow>
          )}
        </dl>
      </Tile>

      {!isDeleted && (
        <Tile heading="Danger Zone" variant={TileVariant.Danger}>
          <DeleteFlowButton flowId={flow.id} name={flow.name} />
        </Tile>
      )}
    </div>
  );
};

interface MetadataRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

const MetadataRow = ({ label, children }: MetadataRowProps) => (
  <div className="flex flex-wrap items-baseline gap-2">
    <dt className="w-40 flex-none font-mono uppercase text-white/40">
      {label}
    </dt>
    <dd className="flex items-baseline gap-1">{children}</dd>
  </div>
);
