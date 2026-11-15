import { getApplicationContext } from "@/modules/application";
import { getSkillArchiveUrl } from "@/modules/mcp-settings/utils/agentDistributionUrls";
import { createSkillDiscoveryIndex } from "@sam-monorepo/mcp";

/**
 * The skill index of the Agent Skills Discovery RFC, for example for
 * `npx skills add <base URL>`. Public and static like the Claude marketplace.
 */
export const dynamic = "force-static";

export const GET = () => {
  const { baseUrl } = getApplicationContext().urls;

  return Response.json(
    createSkillDiscoveryIndex((skillName) =>
      getSkillArchiveUrl(baseUrl, skillName),
    ),
  );
};
