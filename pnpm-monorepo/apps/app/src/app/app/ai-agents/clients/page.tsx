import { requireAuthenticationPage } from "@/modules/auth/server";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ConnectedClientsTile } from "@/modules/mcp-settings/components/ConnectedClientsTile";
import { McpServerDisabledNote } from "@/modules/mcp-settings/components/McpServerDisabledNote";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verbundene Clients",
};

export default async function Page() {
  const { session, authorizePage } = await requireAuthenticationPage(
    "/app/ai-agents/clients",
  );
  await authorizePage("mcp", "use");

  return (
    <div className="flex flex-col gap-4">
      <McpServerDisabledNote />
      <SuspenseWithErrorBoundaryTile>
        <ConnectedClientsTile
          canManageAdminMode={await isAdminModeActive(session)}
        />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
