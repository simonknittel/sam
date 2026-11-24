import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";

/**
 * "The Prisma rule" of docs/architecture.md, as a test because the Lambda
 * functions have no ESLint configuration
 */
const COMPOSITION_ROOT = join("common", "createApplicationContext.ts");

const PRISMA_CLIENT = /\b(?:prisma|PrismaClient)\b|@prisma\/client/;

const listFileNames = async () =>
  (await readdir(import.meta.dirname, { recursive: true })).sort();

test("only the composition root uses the Prisma client", async () => {
  const sourceFileNames = (await listFileNames()).filter(
    (fileName) =>
      fileName.endsWith(".ts") &&
      // This file names the Prisma client in order to forbid it
      join(import.meta.dirname, fileName) !== import.meta.filename,
  );

  const fileNamesWithPrismaClient = (
    await Promise.all(
      sourceFileNames.map(async (fileName) => {
        const source = await readFile(join(import.meta.dirname, fileName), {
          encoding: "utf8",
        });

        return PRISMA_CLIENT.test(source) ? fileName : null;
      }),
    )
  ).filter((fileName) => fileName !== null);

  // Makes sure that the pattern still finds the Prisma client of the root
  expect(fileNamesWithPrismaClient).toEqual([COMPOSITION_ROOT]);
});

test("the Lambda functions have no integration tests", async () => {
  expect(
    (await listFileNames()).filter((fileName) =>
      fileName.endsWith(".integration.test.ts"),
    ),
  ).toEqual([]);
});
