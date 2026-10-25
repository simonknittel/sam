import { describe, expect, test } from "vitest";
import { listToolCatalog } from "./catalog.js";
import {
  SKILL_CATALOG,
  SKILL_DEFINITIONS,
  SKILL_FILE_NAME,
} from "./skillCatalog.js";

/** The naming rule of the Agent Skills specification */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAXIMUM_SKILL_NAME_LENGTH = 64;
const MAXIMUM_SKILL_DESCRIPTION_LENGTH = 1024;

/**
 * The targets of the Markdown links, without the links to a website. A client
 * resolves each of them against the root of the skill, also in a reference.
 */
const RELATIVE_LINK_TARGET = /\]\((?!https?:)([^)\s]+)\)/g;

/** A name in snake_case as Markdown code. The skills use it only for tools. */
const TOOL_NAME_CODE = /`([a-z]+(?:_[a-z]+)+)`/g;

test("the names and the descriptions agree with the Agent Skills specification", () => {
  const names = SKILL_DEFINITIONS.map((skill) => skill.name);
  expect(new Set(names).size).toBe(names.length);

  for (const skill of SKILL_DEFINITIONS) {
    expect(skill.name).toMatch(SKILL_NAME_PATTERN);
    expect(skill.name.length).toBeLessThanOrEqual(MAXIMUM_SKILL_NAME_LENGTH);
    expect(skill.description.length).toBeLessThanOrEqual(
      MAXIMUM_SKILL_DESCRIPTION_LENGTH,
    );
  }
});

describe.each(SKILL_CATALOG)("$frontmatter.name", (skill) => {
  test("each file has its own URI in the directory of the skill", () => {
    const uris = skill.files.map((file) => file.uri);

    expect(new Set(uris).size).toBe(uris.length);
    expect(uris[0]).toBe(skill.uri);
    expect(skill.uri).toBe(
      `skill://${skill.frontmatter.name}/${SKILL_FILE_NAME}`,
    );
    for (const uri of uris)
      expect(uri.startsWith(`skill://${skill.frontmatter.name}/`)).toBe(true);
  });

  test("each tool name is the name of a tool of the catalog", () => {
    const toolNames = new Set(listToolCatalog().map((tool) => tool.name));

    for (const file of skill.files)
      for (const [, name] of file.text.matchAll(TOOL_NAME_CODE))
        expect(toolNames).toContain(name);
  });

  test("each link goes to a file of the skill, and SKILL.md links to each file", () => {
    const uris = new Set(skill.files.map((file) => file.uri));
    const linkedUris = skill.files.flatMap((file) =>
      Array.from(
        file.text.matchAll(RELATIVE_LINK_TARGET),
        ([, target]) => new URL(target!, skill.uri).href,
      ),
    );

    for (const uri of linkedUris) expect(uris).toContain(uri);

    const skillFileText = skill.files[0]!.text;
    for (const file of skill.files.slice(1))
      expect(
        Array.from(
          skillFileText.matchAll(RELATIVE_LINK_TARGET),
          ([, target]) => new URL(target!, skill.uri).href,
        ),
      ).toContain(file.uri);
  });
});
