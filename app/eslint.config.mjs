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

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
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
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-compiler": reactCompiler,
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
          "ts-expect-error": true,
          "ts-ignore": true,
          "ts-nocheck": true,
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
