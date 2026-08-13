import { fixupPluginRules } from "@eslint/compat";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import reactCompiler from "eslint-plugin-react-compiler";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import { defineConfig, globalIgnores } from "eslint/config";
import { dirname } from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The Next.js preset bundles eslint-plugin-react, eslint-plugin-jsx-a11y and
// eslint-plugin-import, which don't support ESLint 10 yet (they still call
// rule-context APIs removed in v10). fixupPluginRules bridges exactly these
// three until upstream catches up. The preset's other plugins (including
// @typescript-eslint, which is also registered directly below) must stay
// unwrapped, or ESLint rejects the config as a plugin redefinition.
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
  ...nextTypescript,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tanstackQuery.configs["flat/recommended"],
  reactYouMightNotNeedAnEffect.configs.recommended,
  prettier,
  reactCompiler.configs.recommended,

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
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
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

      "react-compiler/react-compiler": "error",

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

      // https://github.com/orgs/react-hook-form/discussions/8622
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
