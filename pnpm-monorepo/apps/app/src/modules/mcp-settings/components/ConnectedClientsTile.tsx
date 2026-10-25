import { getRequestActor } from "@/modules/application";
import { formatUserAgent } from "@/modules/auth/utils/formatUserAgent";
import { TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { OwnGrant } from "@sam-monorepo/application";
import type { ToolCatalogGroup } from "@sam-monorepo/mcp";
import clsx from "clsx";
import { getMyOAuthGrants } from "../queries/getMyOAuthGrants";
import { getGrantDisplayName } from "../utils/getGrantDisplayName";
import { listGrantToolGroups } from "../utils/listGrantToolGroups";
import { EditMcpToolsButton } from "./EditMcpToolsButton";
import { OAuthGrantAdminModeSwitch } from "./OAuthGrantAdminModeSwitch";
import { RenameOAuthGrantButton } from "./RenameOAuthGrantButton";
import { RevokeOAuthGrantButton } from "./RevokeOAuthGrantButton";

const BASE_COLUMNS: TableColumn[] = [
  {
    key: "name",
    label: "Name",
    track: "minmax(160px,1fr)",
    minWidth: 160,
  },
  {
    key: "clientHost",
    label: "Client",
    track: "minmax(160px,1fr)",
    minWidth: 160,
  },
  {
    key: "userAgent",
    label: "Browser",
    track: "minmax(140px,1fr)",
    minWidth: 140,
  },
  { key: "createdAt", label: "Verbunden am", track: "150px", minWidth: 150 },
  {
    key: "lastUsedAt",
    label: "Zuletzt verwendet",
    track: "150px",
    minWidth: 150,
  },
];

const ADMIN_MODE_COLUMN: TableColumn = {
  key: "adminMode",
  label: "Admin-Modus",
  track: "110px",
  minWidth: 110,
};

const ACTIONS_COLUMN: TableColumn = {
  key: "actions",
  label: "Aktionen",
  track: "240px",
  minWidth: 240,
  headerClassName: "sr-only",
};

interface Props {
  readonly className?: string;
  /** True while the admin mode of the admin toolbar is active */
  readonly canManageAdminMode: boolean;
}

export const ConnectedClientsTile = async ({
  className,
  canManageAdminMode,
}: Props) => {
  const [grants, actor] = await Promise.all([
    getMyOAuthGrants(),
    getRequestActor(),
  ]);
  const toolGroups = listGrantToolGroups(actor, false);
  const adminModeToolGroups = listGrantToolGroups(actor, true);

  const columns = canManageAdminMode
    ? [...BASE_COLUMNS, ADMIN_MODE_COLUMN, ACTIONS_COLUMN]
    : [...BASE_COLUMNS, ACTIONS_COLUMN];

  return (
    <TableTile
      className={className}
      heading="Verbundene Clients"
      columns={columns}
      isEmpty={grants.length === 0}
      emptyMessage="Du hast noch keinen Client verbunden."
      bodyClassName="text-sm"
    >
      {grants.map((grant) => (
        <ConnectedClientRow
          key={grant.id}
          grant={grant}
          toolGroups={
            grant.adminModeEnabledAt === null ? toolGroups : adminModeToolGroups
          }
          canManageAdminMode={canManageAdminMode}
        />
      ))}
    </TableTile>
  );
};

interface ConnectedClientRowProps {
  readonly grant: OwnGrant;
  readonly toolGroups: readonly ToolCatalogGroup[];
  readonly canManageAdminMode: boolean;
}

const ConnectedClientRow = ({
  grant,
  toolGroups,
  canManageAdminMode,
}: ConnectedClientRowProps) => {
  const displayName = getGrantDisplayName(grant);
  const userAgent = formatUserAgent(grant.userAgent) ?? grant.userAgent;

  return (
    <TRow className="min-h-10">
      <GrantNameCell grant={grant} displayName={displayName} />

      <td className="truncate" title={grant.clientId}>
        {grant.clientHost}
      </td>

      <td
        className={clsx("truncate", { "text-neutral-500": !userAgent })}
        title={grant.userAgent ?? undefined}
      >
        {userAgent ?? "Unbekannt"}
      </td>

      <td>{formatDate(grant.createdAt)}</td>

      <td className={clsx({ "text-neutral-500": !grant.lastUsedAt })}>
        {formatDate(grant.lastUsedAt) ?? "Noch nie"}
      </td>

      {canManageAdminMode && (
        <td>
          <OAuthGrantAdminModeSwitch
            grantId={grant.id}
            displayName={displayName}
            isEnabled={grant.adminModeEnabledAt !== null}
          />
        </td>
      )}

      <td className="flex flex-wrap items-center gap-x-4">
        <EditMcpToolsButton
          grantId={grant.id}
          displayName={displayName}
          clientHost={grant.clientHost}
          toolGroups={toolGroups}
          disabledToolNames={grant.disabledToolNames}
        />

        <RevokeOAuthGrantButton
          grantId={grant.id}
          displayName={displayName}
          clientHost={grant.clientHost}
        />
      </td>
    </TRow>
  );
};

interface GrantNameCellProps {
  readonly grant: OwnGrant;
  readonly displayName: string;
}

/** The own name of the user shows the name of the client below it */
const GrantNameCell = ({ grant, displayName }: GrantNameCellProps) => {
  return (
    <td className="flex min-w-0 items-center gap-2">
      <div className="min-w-0">
        <p className="truncate font-bold" title={displayName}>
          {displayName}
        </p>

        {grant.customName && (
          <p
            className="truncate text-xs text-neutral-500"
            title={grant.clientName}
          >
            {grant.clientName}
          </p>
        )}
      </div>

      <RenameOAuthGrantButton
        className="flex-none"
        grantId={grant.id}
        displayName={displayName}
        clientName={grant.clientName}
        customName={grant.customName}
      />
    </td>
  );
};
