/**
 * Works around https://github.com/prisma/prisma/issues/29549
 *
 * The `prisma-client` generator emits `export const DbNull = runtime.objectEnumValues.instances.DbNull`
 * (and friends) whose inferred types are anonymous classes with native `#private` fields. Since
 * TypeScript 6, declaration emit (`declaration: true` / `composite: true`) fails on these with
 * TS4094 ("Property '#private' of exported anonymous class type may not be private or protected").
 *
 * This script adds explicit type annotations to the affected exports so that declaration emit
 * prints nameable type references instead of anonymous class types. It is idempotent and must run
 * after every `prisma generate`. It can be removed once the upstream issue is fixed.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const generatedInternalDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "generated",
  "prisma",
  "internal",
);

const replacements = [
  ...["DbNull", "JsonNull", "AnyNull"].map((name) => ({
    from: `export const ${name} = runtime.objectEnumValues.instances.${name}`,
    to: `export const ${name}: typeof runtime.objectEnumValues.instances.${name} = runtime.objectEnumValues.instances.${name}`,
  })),
  {
    from: "export const JsonNullValueInput = {\n  JsonNull: JsonNull\n} as const",
    to: "export const JsonNullValueInput: { readonly JsonNull: typeof JsonNull } = {\n  JsonNull: JsonNull\n} as const",
  },
  {
    from: "export const JsonNullValueFilter = {\n  DbNull: DbNull,\n  JsonNull: JsonNull,\n  AnyNull: AnyNull\n} as const",
    to: "export const JsonNullValueFilter: { readonly DbNull: typeof DbNull; readonly JsonNull: typeof JsonNull; readonly AnyNull: typeof AnyNull } = {\n  DbNull: DbNull,\n  JsonNull: JsonNull,\n  AnyNull: AnyNull\n} as const",
  },
];

for (const file of ["prismaNamespace.ts", "prismaNamespaceBrowser.ts"]) {
  const path = join(generatedInternalDirectory, file);
  const before = readFileSync(path, "utf8");
  let after = before;

  for (const { from, to } of replacements) {
    if (after.includes(to)) continue; // Already patched
    if (!after.includes(from)) {
      console.warn(
        `[patch-generated-client] Pattern not found in ${file}: ${JSON.stringify(from.slice(0, 60))}… — Prisma may have changed its codegen. Check whether this patch is still needed.`,
      );
      continue;
    }
    after = after.replace(from, to);
  }

  if (after !== before) {
    writeFileSync(path, after);
    console.log(`[patch-generated-client] Patched ${file}`);
  }
}
