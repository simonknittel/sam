import {
  ProtocolError,
  ProtocolErrorCode,
  type CacheHint,
  type McpServer,
} from "@modelcontextprotocol/server";
import * as z from "zod";
import { SKILL_CATALOG, type ServedSkill } from "./skillCatalog.js";

/** The identifier of the Skills extension in the server capabilities */
export const SKILLS_EXTENSION_ID = "io.modelcontextprotocol/skills";

/**
 * The skills change only with a release and they are the same for all users.
 * Thus a client can keep the entries and the files for one hour.
 */
const SKILL_CACHE_HINT = {
  ttlMs: 60 * 60 * 1000,
  cacheScope: "public",
} as const satisfies CacheHint;

const MARKDOWN_MIME_TYPE = "text/markdown";

/** The entry of a skill in `skills/list` and `skills/get` */
const toSkillEntry = (skill: ServedSkill) => ({
  uri: skill.uri,
  frontmatter: skill.frontmatter,
  resources: skill.files.map(({ uri, digest, size }) => ({
    uri,
    digest,
    size,
  })),
});

/**
 * Registers the skills (https://modelcontextprotocol.io/extensions/skills):
 * each file as a resource for `resources/read`, and the methods `skills/list`
 * and `skills/get`. The server must declare the `resources` capability and
 * the extension.
 */
export const registerSkills = (server: McpServer) => {
  for (const skill of SKILL_CATALOG) {
    for (const file of skill.files) {
      server.registerResource(
        file.name,
        file.uri,
        {
          description: file.description,
          mimeType: MARKDOWN_MIME_TYPE,
          cacheHint: SKILL_CACHE_HINT,
        },
        () => ({
          contents: [
            { uri: file.uri, mimeType: MARKDOWN_MIME_TYPE, text: file.text },
          ],
        }),
      );
    }
  }

  server.server.setRequestHandler(
    "skills/list",
    { params: z.object({ cursor: z.string().optional() }) },
    ({ cursor }) => {
      // All skills fit on one page, thus the server never gives a cursor
      if (cursor !== undefined)
        throw new ProtocolError(
          ProtocolErrorCode.InvalidParams,
          "The cursor is not valid",
        );

      return { skills: SKILL_CATALOG.map(toSkillEntry), ...SKILL_CACHE_HINT };
    },
  );

  server.server.setRequestHandler(
    "skills/get",
    { params: z.object({ uri: z.string() }) },
    ({ uri }) => {
      const skill = SKILL_CATALOG.find(
        (servedSkill) => servedSkill.uri === uri,
      );
      if (!skill)
        throw new ProtocolError(
          ProtocolErrorCode.InvalidParams,
          `No skill is served at ${uri}`,
        );

      return { skill: toSkillEntry(skill), ...SKILL_CACHE_HINT };
    },
  );
};
