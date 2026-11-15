import { createApplicationUrls } from "@sam-monorepo/application";
import { strFromU8, unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import { createClaudePluginArchive, createSkillArchive } from "./agentFiles.js";
import { SKILL_CATALOG } from "./skillCatalog.js";

const context = {
  urls: createApplicationUrls({
    baseUrl: "https://sam.example.com",
    publicUploadBaseUrl: "https://uploads.example.com",
  }),
};

const readArchive = (bytes: Uint8Array) =>
  Object.fromEntries(
    Object.entries(unzipSync(bytes)).map(([path, content]) => [
      path,
      strFromU8(content),
    ]),
  );

afterEach(() => {
  vi.useRealTimers();
});

test("an archive has the same bytes at a different time", () => {
  vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
  const first = createClaudePluginArchive(context);
  vi.setSystemTime(new Date("2027-06-15T12:34:56Z"));
  const second = createClaudePluginArchive(context);

  expect(second.bytes).toEqual(first.bytes);
  expect(second.sha256).toBe(
    createHash("sha256").update(first.bytes).digest("hex"),
  );
});

test("the plugin has the MCP server of the host and all files of all skills", () => {
  const files = readArchive(createClaudePluginArchive(context).bytes);

  expect(JSON.parse(files[".claude-plugin/plugin.json"] ?? "")).toMatchObject({
    name: "sam",
    homepage: "https://sam.example.com/app/ai-agents",
  });
  expect(JSON.parse(files[".mcp.json"] ?? "")).toEqual({
    mcpServers: {
      sam: { type: "http", url: "https://sam.example.com/api/mcp" },
    },
  });
  for (const skill of SKILL_CATALOG)
    for (const file of skill.files)
      expect(files[`skills/${skill.frontmatter.name}/${file.path}`]).toBe(
        file.text,
      );
});

test("a skill archive has the files of the skill at its root", () => {
  for (const skill of SKILL_CATALOG) {
    const archive = createSkillArchive(skill.frontmatter.name);
    if (!archive) throw new Error(`No archive for ${skill.frontmatter.name}`);

    expect(readArchive(archive.bytes)).toEqual(
      Object.fromEntries(skill.files.map((file) => [file.path, file.text])),
    );
  }
});
