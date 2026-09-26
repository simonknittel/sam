import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const SOURCE_DIRECTORY = dirname(fileURLToPath(import.meta.url));

/**
 * Specifiers of the imports and re-exports that stay in the build output.
 * `import type` and `export type` are removed by the compiler, so they do
 * not count.
 */
const RUNTIME_IMPORT_PATTERN =
  /^(?:import|export)\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?"([^"]+)"/gm;

const collectRuntimeImports = (
  fileName: string,
  visited = new Set<string>(),
): string[] => {
  if (visited.has(fileName)) return [];
  visited.add(fileName);

  const source = readFileSync(join(SOURCE_DIRECTORY, fileName), "utf8");
  return [...source.matchAll(RUNTIME_IMPORT_PATTERN)].flatMap(
    ([, specifier = ""]) =>
      specifier.startsWith("./")
        ? collectRuntimeImports(
            specifier.slice("./".length).replace(/\.js$/, ".ts"),
            visited,
          )
        : [specifier],
  );
};

describe("helpers entry", () => {
  test("loads no package code, so the read view does not load the editor", () => {
    expect(collectRuntimeImports("helpers.ts")).toEqual([]);
  });

  test("the check finds the package imports of the editor entry", () => {
    expect(collectRuntimeImports("index.ts")).toContain("@tiptap/core");
  });
});
