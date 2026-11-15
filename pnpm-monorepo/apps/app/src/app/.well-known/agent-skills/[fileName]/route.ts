import { SKILL_ARCHIVE_EXTENSION } from "@/modules/mcp-settings/utils/agentDistributionUrls";
import { archiveResponse } from "@/modules/mcp-settings/utils/archiveResponse";
import { buildSkillArchive, listSkillNames } from "@sam-monorepo/mcp";

/**
 * The archive of one skill (`<skill name>.zip`). Public and static like the
 * Claude marketplace. A different file name gives a 404.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export const generateStaticParams = () =>
  listSkillNames().map((skillName) => ({
    fileName: `${skillName}${SKILL_ARCHIVE_EXTENSION}`,
  }));

export const GET = async (
  _request: Request,
  { params }: RouteContext<"/.well-known/agent-skills/[fileName]">,
) => {
  const { fileName } = await params;
  const archive = fileName.endsWith(SKILL_ARCHIVE_EXTENSION)
    ? buildSkillArchive(fileName.slice(0, -SKILL_ARCHIVE_EXTENSION.length))
    : null;
  if (!archive) return new Response(null, { status: 404 });

  return archiveResponse(archive, fileName);
};
