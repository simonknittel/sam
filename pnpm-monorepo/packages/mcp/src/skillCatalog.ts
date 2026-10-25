import { createHash } from "node:crypto";
import type { SkillDefinition } from "./skillDefinition.js";
import { samOverviewSkill } from "./skills/samOverview/index.js";
import { samPermissionsSkill } from "./skills/samPermissions/index.js";

export const SKILL_FILE_NAME = "SKILL.md";

/** A file of a skill with the text that `resources/read` gives */
export interface ServedSkillFile {
  readonly uri: string;
  /** The name of the resource in `resources/list` */
  readonly name: string;
  readonly description: string;
  readonly text: string;
  /** `sha256:` and the SHA-256 digest of the UTF-8 bytes of `text` in hexadecimal */
  readonly digest: string;
  /** The number of UTF-8 bytes of `text` */
  readonly size: number;
}

/** A skill as the Skills extension of MCP serves it */
export interface ServedSkill {
  /** The URI of `SKILL.md` */
  readonly uri: string;
  /** The YAML frontmatter of `SKILL.md` as an object */
  readonly frontmatter: {
    readonly name: string;
    readonly description: string;
  };
  /** All files of the skill, `SKILL.md` first */
  readonly files: readonly ServedSkillFile[];
}

/**
 * The frontmatter and the instructions. A JSON string is also a valid YAML
 * string. Thus the description can contain all characters, and YAML reads a
 * name such as `true` or `123` as a string.
 */
const renderSkillFile = ({
  name,
  description,
  instructions,
}: SkillDefinition) =>
  `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description)}\n---\n\n${instructions}`;

const toServedFile = (
  file: Omit<ServedSkillFile, "digest" | "size">,
): ServedSkillFile => {
  const bytes = new TextEncoder().encode(file.text);

  return {
    ...file,
    digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    size: bytes.byteLength,
  };
};

const toServedSkill = (skill: SkillDefinition): ServedSkill => {
  const rootUrl = new URL(`skill://${skill.name}/`);
  const toUri = (path: string) => new URL(path, rootUrl).href;

  return {
    uri: toUri(SKILL_FILE_NAME),
    frontmatter: { name: skill.name, description: skill.description },
    files: [
      toServedFile({
        uri: toUri(SKILL_FILE_NAME),
        name: skill.name,
        description: skill.description,
        text: renderSkillFile(skill),
      }),
      ...skill.files.map((file) =>
        toServedFile({
          uri: toUri(file.path),
          name: `${skill.name}/${file.path}`,
          description: file.description,
          text: file.content,
        }),
      ),
    ],
  };
};

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  samOverviewSkill,
  samPermissionsSkill,
];

/**
 * All skills of the server. They change only with a release, thus the
 * digests are calculated one time.
 */
export const SKILL_CATALOG: readonly ServedSkill[] =
  SKILL_DEFINITIONS.map(toServedSkill);
