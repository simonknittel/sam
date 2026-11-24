import tanstackQuery from "@tanstack/eslint-plugin-query";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// A later configuration object that sets `no-restricted-imports` replaces the
// whole option array of the rule for its files. Thus it spreads this list.
const sharedRestrictedImports = [
  {
    name: "next/link",
    message: "Please use @/modules/common/components/Link instead.",
  },
  {
    name: "@radix-ui/react-popover",
    message: "Please use @/modules/common/components/Popover instead.",
  },
  {
    name: "@base-ui/react/popover",
    message: "Please use @/modules/common/components/PopoverBaseUI instead.",
  },
  {
    name: "@radix-ui/react-tooltip",
    message: "Please use @/modules/common/components/Tooltip instead.",
  },
  {
    name: "@headlessui/react",
    importNames: ["Popover"],
    message: "Please use @/modules/common/components/Popover instead.",
  },
  {
    name: "@headlessui/react",
    importNames: ["Tab", "TabList"],
    message: "Please use @/modules/common/components/tabs instead.",
  },
];

const useCasesOnlyMessage =
  "Use a use case of @sam-monorepo/application. Only src/modules/application and src/modules/auth/server use Prisma.";

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tanstackQuery.configs["flat/recommended"],
  reactYouMightNotNeedAnEffect.configs.recommended,
  prettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/",
    "eslint.config.mjs",
    "postcss.config.cjs",
    "prettier.config.mjs",
    "tailwind.config.ts",
    "vitest.config.mts",
    "**/service-worker.js",
  ]),

  {
    name: "custom-rules",
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      "@typescript-eslint/prefer-nullish-coalescing": "off",

      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          // Suppressions must carry a justification; bare ones are flagged.
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": "allow-with-description",
          "ts-check": false,
        },
      ],

      // Some JSX attributes get handlers that return a promise: the URL state
      // setters of nuqs, the `refetch()` of tRPC, the notification mutations
      // and the async items of the command menu. React ignores the promise.
      "@typescript-eslint/no-misused-promises": [
        2,
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],

      "no-restricted-imports": ["error", ...sharedRestrictedImports],

      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration:matches([source.value='zod'], [source.value='zod/mini']) > :matches(ImportSpecifier[imported.name='z'], ImportDefaultSpecifier)",
          message:
            'Use `import * as z from "zod"` (or "zod/mini"). With the named or default import, the client bundle keeps all Zod locales.',
        },
        {
          selector:
            "Program:has(> ExpressionStatement[directive='use client']) ImportDeclaration[source.value='zod'][importKind!='type']",
          message:
            'Use `import * as z from "zod/mini"` in a client module. Full Zod adds about 100 KB to each page that loads the module.',
        },
      ],

      // The React Compiler does not compile a component or a hook with syntax
      // that it does not support yet ("todo") or that stops one of its
      // internal checks ("invariant"). The build of Next.js does not show
      // these components, thus lint must show them.
      // The rules also report server components, but Next.js does not compile
      // server components. There, a rewrite or an `eslint-disable-next-line`
      // with a reason is correct.
      // Lint uses the Babel compiler, but the build uses its Rust port (see
      // `reactCompiler` in next.config.ts). Thus the two can skip different
      // components. After an upgrade of Next.js, examine the client chunks of
      // the build: each compiled component calls the cache of the compiler.
      "react-hooks/todo": "error",
      "react-hooks/invariant": "error",

      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          // This needs to be set to true to make use of the `satisfies never` type guard for `switch` statements exhaustive checks.
          allowNever: true,
        },
      ],
    },
  },

  {
    name: "use-cases-only",
    // Only the composition root and the auth zone (the next-auth adapter and
    // the session callback) use the Prisma client
    files: ["src/**"],
    ignores: ["src/modules/application/**", "src/modules/auth/server/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        ...sharedRestrictedImports,
        {
          name: "@sam-monorepo/database",
          importNames: ["prisma", "PrismaClient"],
          message: useCasesOnlyMessage,
        },
        {
          name: "@sam-monorepo/database/client",
          importNames: ["PrismaClient"],
          message: useCasesOnlyMessage,
        },
        { name: "@prisma/client", message: useCasesOnlyMessage },
      ],
    },
  },
]);

export default eslintConfig;
