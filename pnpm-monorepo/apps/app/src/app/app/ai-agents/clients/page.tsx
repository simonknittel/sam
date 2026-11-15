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
        {/* The admin mode of a client is only managed while the admin mode
            of the toolbar is active, which is never the case while an admin
            assumes a user */}
        <ConnectedClientsTile
          canManageAdminMode={await isAdminModeActive(session)}
        />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
