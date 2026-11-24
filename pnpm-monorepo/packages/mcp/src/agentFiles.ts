import type { ApplicationContext } from "@sam-monorepo/application";
import { createArchive, type Archive } from "./archive.js";
import { getAiAgentsAppUrl } from "./settingsPageUrl.js";
import { SKILL_CATALOG } from "./skillCatalog.js";

/**
 * The files that give the skills and the MCP server to clients without the
 * Skills extension of MCP: one archive for each skill, the index of the Agent
 * Skills Discovery RFC (https://github.com/cloudflare/agent-skills-discovery-rfc)
 * and a Claude plugin with its marketplace. The host serves them.
 */

const CLAUDE_PLUGIN_NAME = "sam";

export const CLAUDE_MARKETPLACE_NAME = "sam";

export const CLAUDE_PLUGIN_ID = `${CLAUDE_PLUGIN_NAME}@${CLAUDE_MARKETPLACE_NAME}`;

/** The name that Claude Code shows for the MCP server of the plugin */
export const CLAUDE_PLUGIN_MCP_SERVER_LABEL = `plugin:${CLAUDE_PLUGIN_NAME}:${CLAUDE_PLUGIN_NAME}`;

/** German, because Claude shows it to the members in the list of plugins */
const CLAUDE_PLUGIN_DESCRIPTION =
  "Der MCP-Server und die Skills von SAM (Sinister Administration Module)";

const CLAUDE_PLUGIN_AUTHOR = { name: "SAM" };

const SKILL_DISCOVERY_INDEX_SCHEMA =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

type UrlContext = Pick<ApplicationContext, "urls">;

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const listSkillNames = () =>
  SKILL_CATALOG.map((skill) => skill.frontmatter.name);

/**
 * `SKILL.md` is at the root of the archive, as the Agent Skills Discovery RFC
 * requires. Gives null for an unknown skill.
 */
export const createSkillArchive = (skillName: string): Archive | null => {
  const skill = SKILL_CATALOG.find(
    (servedSkill) => servedSkill.frontmatter.name === skillName,
  );

  return skill ? createArchive(skill.files) : null;
};

/**
 * A Claude plugin with the MCP server of the host and all skills. The
 * manifest has no version: Claude Code then uses the SHA-256 digest of the
 * archive, thus each change of the content is an update.
 */
export const createClaudePluginArchive = (context: UrlContext) =>
  createArchive([
    {
      path: ".claude-plugin/plugin.json",
      text: toJson({
        name: CLAUDE_PLUGIN_NAME,
        description: CLAUDE_PLUGIN_DESCRIPTION,
        author: CLAUDE_PLUGIN_AUTHOR,
        homepage: getAiAgentsAppUrl(context),
      }),
    },
    {
      path: ".mcp.json",
      text: toJson({
        mcpServers: {
          [CLAUDE_PLUGIN_NAME]: {
            type: "http",
            url: context.urls.mcpResourceUrl.href,
          },
        },
      }),
    },
    ...SKILL_CATALOG.flatMap((skill) =>
      skill.files.map((file) => ({
        path: `skills/${skill.frontmatter.name}/${file.path}`,
        text: file.text,
      })),
    ),
  ]);

/**
 * A marketplace of Claude Code with the plugin as its only entry. Claude Code
 * loads only this document from its URL, thus the source of the plugin is the
 * URL of its archive. Before the installation, Claude Code shows only the
 * fields of the entry, thus the entry repeats the description.
 */
export const createClaudeMarketplace = (
  context: UrlContext,
  pluginArchiveUrl: URL,
) => ({
  name: CLAUDE_MARKETPLACE_NAME,
  owner: CLAUDE_PLUGIN_AUTHOR,
  description: CLAUDE_PLUGIN_DESCRIPTION,
  plugins: [
    {
      name: CLAUDE_PLUGIN_NAME,
      description: CLAUDE_PLUGIN_DESCRIPTION,
      homepage: getAiAgentsAppUrl(context),
      source: {
        source: "archive",
        url: pluginArchiveUrl.href,
        sha256: createClaudePluginArchive(context).sha256,
      },
    },
  ],
});

export const createSkillDiscoveryIndex = (
  getSkillArchiveUrl: (skillName: string) => URL,
) => ({
  $schema: SKILL_DISCOVERY_INDEX_SCHEMA,
  skills: SKILL_CATALOG.map((skill) => ({
    name: skill.frontmatter.name,
    type: "archive",
    description: skill.frontmatter.description,
    url: getSkillArchiveUrl(skill.frontmatter.name).href,
    digest: `sha256:${createArchive(skill.files).sha256}`,
  })),
});
