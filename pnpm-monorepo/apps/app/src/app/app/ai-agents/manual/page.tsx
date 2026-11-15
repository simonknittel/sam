import { getApplicationContext } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { McpServerDisabledNote } from "@/modules/mcp-settings/components/McpServerDisabledNote";
import { McpServerTile } from "@/modules/mcp-settings/components/McpServerTile";
import { SkillsTile } from "@/modules/mcp-settings/components/SkillsTile";
import {
  getSkillArchiveFileName,
  getSkillArchiveUrl,
} from "@/modules/mcp-settings/utils/agentFileUrls";
import { listSkillNames } from "@sam-monorepo/mcp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manuell",
};

export default async function Page() {
  const { authorizePage } = await requireAuthenticationPage(
    "/app/ai-agents/manual",
  );
  await authorizePage("mcp", "use");

  const { baseUrl, mcpResourceUrl } = getApplicationContext().urls;

  return (
    <div className="flex flex-col gap-4">
      <McpServerDisabledNote />
      <McpServerTile mcpUrl={mcpResourceUrl.href} />
      <SkillsTile
        skillsUrl={baseUrl.origin}
        skillArchives={listSkillNames().map((skillName) => ({
          fileName: getSkillArchiveFileName(skillName),
          url: getSkillArchiveUrl(baseUrl, skillName).href,
        }))}
      />
    </div>
  );
}
