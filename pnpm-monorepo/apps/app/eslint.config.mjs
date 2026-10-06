import { fixupPluginRules } from "@eslint/compat";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// The Next.js preset bundles eslint-plugin-react, eslint-plugin-jsx-a11y and
// eslint-plugin-import, which don't support ESLint 10 yet (they still call
// rule-context APIs removed in v10). fixupPluginRules bridges exactly these
// three until upstream catches up. The preset's other plugins (including
// @typescript-eslint, which the typescript-eslint presets below also register)
// must stay unwrapped, or ESLint rejects the config as a plugin redefinition.
// Both sides must also resolve to the same copy of @typescript-eslint, which
// the `typescript-eslint` override in pnpm-workspace.yaml takes care of.
const pluginsWithoutEslint10Support = ["react", "jsx-a11y", "import"];
const nextCoreWebVitalsFixedUp = nextCoreWebVitals.map((configEntry) => {
  if (!configEntry.plugins) return configEntry;
  return {
    ...configEntry,
    plugins: Object.fromEntries(
      Object.entries(configEntry.plugins).map(([pluginName, plugin]) => [
        pluginName,
        pluginsWithoutEslint10Support.includes(pluginName)
          ? fixupPluginRules(plugin)
          : plugin,
      ]),
    ),
  };
});

const eslintConfig = defineConfig([
  ...nextCoreWebVitalsFixedUp,
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
    "vitest.config.ts",
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
      // In October 2026, 9 attributes in 7 files need this option.
      "@typescript-eslint/no-misused-promises": [
        2,
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],

      "no-restricted-imports": [
        "error",
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
          message:
            "Please use @/modules/common/components/PopoverBaseUI instead.",
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
      ],

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
]);

export default eslintConfig;
