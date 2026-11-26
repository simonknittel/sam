import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";

/**
 * The relay service is a host (see `docs/architecture.md`): it calls the use
 * cases of `@sam-monorepo/application` and composes the ports of
 * `@sam-monorepo/infrastructure`. Only its composition root uses the Prisma
 * client. This is different from the collab server, which uses Prisma
 * directly.
 */
const COMPOSITION_ROOT = "applicationContext.ts";

const PRISMA_CLIENT = /\b(?:prisma|PrismaClient)\b|@prisma\/client/;

/**
 * Next.js, React, the modules of the app (`@/…`), `server-only` (a marker of
 * Next.js) and the other hosts
 */
const FORBIDDEN_IMPORT =
  /^(?:next|next\/.*|react|react\/.*|react-dom|react-dom\/.*|server-only|@\/.*|@sam-monorepo\/(?:app|lambda|collab|scripts|playwright|mcp)(?:\/.*)?)$/;

/** Static imports, re-exports, side-effect imports and dynamic imports */
const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

/** The packages of the monorepo that the `package.json` of the relay service may list */
const ALLOWED_PACKAGES = [
  "@sam-monorepo/application",
  "@sam-monorepo/database",
  "@sam-monorepo/domain",
  "@sam-monorepo/infrastructure",
];

const readSourceFiles = async () => {
  const fileNames = (await readdir(import.meta.dirname, { recursive: true }))
    .filter(
      (fileName) =>
        fileName.endsWith(".ts") &&
        // This file names the Prisma client in order to forbid it
        join(import.meta.dirname, fileName) !== import.meta.filename,
    )
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => ({
      fileName,
      source: await readFile(join(import.meta.dirname, fileName), {
        encoding: "utf8",
      }),
    })),
  );
};

test("only the composition root uses the Prisma client", async () => {
  const fileNamesWithPrismaClient = (await readSourceFiles())
    .filter(({ source }) => PRISMA_CLIENT.test(source))
    .map(({ fileName }) => fileName);

  // Makes sure that the pattern still finds the Prisma client of the root
  expect(fileNamesWithPrismaClient).toEqual([COMPOSITION_ROOT]);
});

test("the relay service does not import Next.js, React or a different host", async () => {
  const imports = (await readSourceFiles()).flatMap(({ fileName, source }) =>
    Array.from(source.matchAll(IMPORT_SPECIFIER), (match) => ({
      fileName,
      specifier: match[1] ?? "",
    })),
  );

  // Makes sure that the pattern still finds the imports of the relay service
  expect(imports.length).toBeGreaterThan(0);

  expect(
    imports.filter(({ specifier }) => FORBIDDEN_IMPORT.test(specifier)),
  ).toEqual([]);
});

test("the relay service lists only the allowed packages of the monorepo", async () => {
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
