import { getApplicationUrls } from "@/modules/application";
import { getSkillArchiveUrl } from "@/modules/mcp-settings/utils/agentFileUrls";
import { createSkillDiscoveryIndex } from "@sam-monorepo/mcp";

/** Public and static, see `docs/mcp-server.md#files-for-ai-agents` */
export const dynamic = "force-static";

export const GET = () => {
  const { baseUrl } = getApplicationUrls();

  return Response.json(
    createSkillDiscoveryIndex((skillName) =>
      getSkillArchiveUrl(baseUrl, skillName),
    ),
  );
};
