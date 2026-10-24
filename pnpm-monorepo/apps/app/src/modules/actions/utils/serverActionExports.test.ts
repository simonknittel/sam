import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, test } from "vitest";

/**
 * Each export of a `"use server"` module is a public HTTP endpoint. The
 * factories run the gate of the session (see `createAuthenticatedAction()`)
 * before the action, thus each export must be the result of one of them.
 */
const GATED_ACTION_FACTORIES = new Set([
  "createAuthenticatedAction",
  "createUseCaseAction",
  "createTaskUpdateAction",
]);

/** Exports without a factory, each with the reason of its own gate */
const UNGATED_EXPORTS = new Set([
  // Refuses to run outside of development: the visitor has no session yet
  "modules/auth/actions/developmentLogin.ts#developmentLogin",
]);

/** Inline `"use server"` functions, each only a call of a gated action */
const INLINE_SERVER_FUNCTION_FILES = new Set([
  "app/email-confirmation/page.tsx",
]);

const SOURCE_DIRECTORY = fileURLToPath(new URL("../../../", import.meta.url));

const SOURCE_FILES = readdirSync(SOURCE_DIRECTORY, { recursive: true })
  .map(String)
  .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))
  .map((path) => ({
    path,
    sourceFile: ts.createSourceFile(
      path,
      readFileSync(`${SOURCE_DIRECTORY}${path}`, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    ),
  }));

const isUseServerDirective = (statement: ts.Node) =>
  ts.isExpressionStatement(statement) &&
  ts.isStringLiteral(statement.expression) &&
  statement.expression.text === "use server";

const isExported = (statement: ts.Statement) =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );

const getCalleeName = (expression: ts.Expression | undefined) =>
  expression &&
  ts.isCallExpression(expression) &&
  ts.isIdentifier(expression.expression)
    ? expression.expression.text
    : null;

/** The exports of a `"use server"` module that no factory gates */
const findUngatedExports = (path: string, sourceFile: ts.SourceFile) =>
  sourceFile.statements.flatMap((statement): string[] => {
    // Types do not exist at runtime
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    )
      return [];

    if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement))
      return [`${path}: ${statement.getText()}`];

    if (!isExported(statement)) return [];

    if (!ts.isVariableStatement(statement))
      return [`${path}: ${statement.getText().split("\n")[0]}`];

    return statement.declarationList.declarations
      .filter((declaration) => {
        const name = declaration.name.getText();

        return (
          !GATED_ACTION_FACTORIES.has(
            getCalleeName(declaration.initializer) ?? "",
          ) && !UNGATED_EXPORTS.has(`${path}#${name}`)
        );
      })
      .map((declaration) => `${path}#${declaration.name.getText()}`);
  });

const hasInlineServerFunction = (sourceFile: ts.SourceFile) => {
  const visit = (node: ts.Node): boolean =>
    (ts.isBlock(node) && node.statements.some(isUseServerDirective)) ||
    (ts.forEachChild(node, visit) ?? false);

  return sourceFile.statements.some((statement) => visit(statement));
};

test("each export of a server action module is a gated action", () => {
  const serverActionModules = SOURCE_FILES.filter(({ sourceFile }) =>
    sourceFile.statements.slice(0, 1).some(isUseServerDirective),
  );

  // Protection against a broken search: the app has many server actions
  expect(serverActionModules.length).toBeGreaterThan(100);
  expect(
    serverActionModules.flatMap(({ path, sourceFile }) =>
      findUngatedExports(path, sourceFile),
    ),
  ).toEqual([]);
});

test("each inline server function is in a known file", () => {
  expect(
    SOURCE_FILES.filter(({ sourceFile }) => hasInlineServerFunction(sourceFile))
      .map(({ path }) => path)
      .filter((path) => !INLINE_SERVER_FUNCTION_FILES.has(path)),
  ).toEqual([]);
});
