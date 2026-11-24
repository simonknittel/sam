import { getSkillArchiveFileName } from "@/modules/mcp-settings/utils/agentFileUrls";
import { archiveResponse } from "@/modules/mcp-settings/utils/archiveResponse";
import { createSkillArchive, listSkillNames } from "@sam-monorepo/mcp";

/** Public and static, see `docs/mcp-server.md#files-for-ai-agents` */
export const dynamic = "force-static";
export const dynamicParams = false;

export const generateStaticParams = () =>
  listSkillNames().map((skillName) => ({
    fileName: getSkillArchiveFileName(skillName),
  }));

export const GET = async (
  _request: Request,
  { params }: RouteContext<"/.well-known/agent-skills/[fileName]">,
) => {
  const { fileName } = await params;
  const skillName = listSkillNames().find(
    (name) => getSkillArchiveFileName(name) === fileName,
  );
  const archive = skillName ? createSkillArchive(skillName) : null;
  if (!archive) return new Response(null, { status: 404 });

  return archiveResponse(archive, fileName);
};
