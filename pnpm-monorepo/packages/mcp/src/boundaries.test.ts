import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";

/**
 * The host gives the application context, thus the package must not import
 * `infrastructure`, the implementations of the ports
 */
const FORBIDDEN_IMPORT =
  /^(?:next|next\/.*|react|react\/.*|react-dom|react-dom\/.*|server-only|@\/.*|@sam-monorepo\/(?:app|lambda|collab|scripts|playwright|infrastructure)(?:\/.*)?)$/;

/** Static imports, re-exports, side-effect imports and dynamic imports */
const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

/** The dependency directions of `docs/architecture.md` */
const ALLOWED_PACKAGES = [
  "@sam-monorepo/application",
  "@sam-monorepo/database",
  "@sam-monorepo/domain",
];

test("the package does not import Next.js, React, a host or the infrastructure", async () => {
  const fileNames = (await readdir(import.meta.dirname, { recursive: true }))
    .filter((fileName) => fileName.endsWith(".ts"))
    .sort();

  const imports = await Promise.all(
    fileNames.map(async (fileName) => {
      const source = await readFile(join(import.meta.dirname, fileName), {
        encoding: "utf8",
      });

      return Array.from(source.matchAll(IMPORT_SPECIFIER), (match) => ({
        fileName,
        specifier: match[1] ?? "",
      }));
    }),
  ).then((importsPerFile) => importsPerFile.flat());

  // Makes sure that the pattern still finds the imports of the package
  expect(imports.length).toBeGreaterThan(0);

  expect(
    imports.filter(({ specifier }) => FORBIDDEN_IMPORT.test(specifier)),
  ).toEqual([]);
});

test("the package lists only the allowed packages of the monorepo", async () => {
  const manifest = JSON.parse(
    await readFile(join(import.meta.dirname, "..", "package.json"), {
      encoding: "utf8",
    }),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const listedPackages = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  })
    .filter((name) => name.startsWith("@sam-monorepo/"))
    .sort();

  expect(listedPackages).toEqual(ALLOWED_PACKAGES);
});
