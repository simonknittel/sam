import { requireAuthenticationPage } from "@/modules/auth/server";
import { AiAgentsOverviewTile } from "@/modules/mcp-settings/components/AiAgentsOverviewTile";
import { InstallationOptionsTile } from "@/modules/mcp-settings/components/InstallationOptionsTile";
import { McpServerDisabledNote } from "@/modules/mcp-settings/components/McpServerDisabledNote";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Übersicht",
};

export default async function Page() {
  const { authorizePage } = await requireAuthenticationPage("/app/ai-agents");
  await authorizePage("mcp", "use");

  return (
    <div className="flex flex-col gap-4">
      <McpServerDisabledNote />
      <AiAgentsOverviewTile />
      <InstallationOptionsTile />
    </div>
  );
}
