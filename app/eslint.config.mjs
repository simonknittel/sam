import { FlatCompat } from "@eslint/eslintrc";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:@tanstack/query/recommended",
  ),

  {
    ignores: [
      ".next/**",
      "scripts/**",
      "build/**",
      "node_modules/**",
      "out/**",
      "tailwind.config.ts",
      "vitest.config.ts",
      "next-env.d.ts",
      "postcss.config.cjs",
      "prettier.config.mjs",
    ],
  },

  ...compat.config({
    plugins: ["@typescript-eslint", "react-compiler"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: true,
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
    },
  }),

  reactYouMightNotNeedAnEffect.configs.recommended,
];

export default eslintConfig;
