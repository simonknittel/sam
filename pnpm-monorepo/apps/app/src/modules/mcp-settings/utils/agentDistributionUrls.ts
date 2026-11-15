/**
 * The public URLs of the files for AI agents (see `docs/mcp-server.md`). The
 * paths are the paths of the route handlers.
 */

export const SKILL_ARCHIVE_EXTENSION = ".zip";

export const getClaudeMarketplaceUrl = (baseUrl: URL) =>
  new URL("/api/ai-agents/claude/marketplace.json", baseUrl);

export const getClaudePluginArchiveUrl = (baseUrl: URL) =>
  new URL("/api/ai-agents/claude/sam.zip", baseUrl);

export const getSkillArchiveUrl = (baseUrl: URL, skillName: string) =>
  new URL(
    `/.well-known/agent-skills/${encodeURIComponent(skillName)}${SKILL_ARCHIVE_EXTENSION}`,
    baseUrl,
  );
