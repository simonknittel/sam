import { getApplicationUrls } from "@/modules/application";
import { getSkillArchiveUrl } from "@/modules/mcp-settings/utils/agentFileUrls";
import { createSkillDiscoveryIndex } from "@sam-monorepo/mcp";

/**
 * The skill index of the Agent Skills Discovery RFC, for example for
 * `npx skills add <base URL>`. Public and static, see
 * `docs/mcp-server.md#files-for-ai-agents`.
 */
export const dynamic = "force-static";

export const GET = () => {
  const { baseUrl } = getApplicationUrls();

  return Response.json(
    createSkillDiscoveryIndex((skillName) =>
      getSkillArchiveUrl(baseUrl, skillName),
    ),
  );
};
