/** The paths are the paths of the route handlers */

export const CLAUDE_PLUGIN_ARCHIVE_FILE_NAME = "sam.zip";

export const getSkillArchiveFileName = (skillName: string) =>
  `${skillName}.zip`;

export const getClaudeMarketplaceUrl = (baseUrl: URL) =>
  new URL("/api/ai-agents/claude/marketplace.json", baseUrl);

export const getClaudePluginArchiveUrl = (baseUrl: URL) =>
  new URL(`/api/ai-agents/claude/${CLAUDE_PLUGIN_ARCHIVE_FILE_NAME}`, baseUrl);

export const getSkillArchiveUrl = (baseUrl: URL, skillName: string) =>
  new URL(
    `/.well-known/agent-skills/${encodeURIComponent(getSkillArchiveFileName(skillName))}`,
    baseUrl,
  );
