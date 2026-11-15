import { createApplicationUrls } from "@sam-monorepo/application";
import { strFromU8, unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import {
  buildClaudePluginArchive,
  buildSkillArchive,
  createClaudeMarketplace,
  createSkillDiscoveryIndex,
  listSkillNames,
} from "./agentDistribution.js";
import { SKILL_CATALOG, SKILL_FILE_NAME } from "./skillCatalog.js";

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

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

afterEach(() => {
  vi.useRealTimers();
});

test("an archive has the same bytes at a different time", () => {
  vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
  const first = buildClaudePluginArchive(context);
  vi.setSystemTime(new Date("2027-06-15T12:34:56Z"));
  const second = buildClaudePluginArchive(context);

  expect(second.bytes).toEqual(first.bytes);
  expect(second.sha256).toBe(sha256(first.bytes));
});

test("the plugin has the MCP server of the host and all files of all skills", () => {
  const files = readArchive(buildClaudePluginArchive(context).bytes);

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

test("the marketplace points to the plugin archive with its digest", () => {
  const archiveUrl = new URL("https://sam.example.com/claude/sam.zip");

  expect(createClaudeMarketplace(context, archiveUrl).plugins).toEqual([
    expect.objectContaining({
      name: "sam",
      source: {
        source: "archive",
        url: archiveUrl.href,
        sha256: buildClaudePluginArchive(context).sha256,
      },
    }),
  ]);
});

test("the index gives each skill archive with its digest, and SKILL.md is at the root of the archive", () => {
  const index = createSkillDiscoveryIndex(
    (skillName) => new URL(`https://sam.example.com/skills/${skillName}.zip`),
  );

  expect(index.skills.map((entry) => entry.name)).toEqual(listSkillNames());
  for (const entry of index.skills) {
    const archive = buildSkillArchive(entry.name);
    if (!archive) throw new Error(`No archive for ${entry.name}`);

    expect(entry).toMatchObject({
      type: "archive",
      url: `https://sam.example.com/skills/${entry.name}.zip`,
      digest: `sha256:${sha256(archive.bytes)}`,
    });
    expect(Object.keys(readArchive(archive.bytes))).toContain(SKILL_FILE_NAME);
  }
  expect(buildSkillArchive("unknown")).toBeNull();
});
