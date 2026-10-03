/** @type {import("prettier").Config} */
const config = {
  // prettier-plugin-tailwindcss must be the last plugin (see its README).
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles/globals.css",
  tailwindFunctions: ["clsx"],
};

export default config;
