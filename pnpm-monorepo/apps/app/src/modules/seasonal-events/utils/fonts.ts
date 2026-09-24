import { Creepster, Monoton, Mountains_of_Christmas } from "next/font/google";
import type { SeasonalFont } from "./types";

/**
 * The hero fonts of the seasonal events. All three are loaded with
 * `preload: false` on purpose: a preload hint travels in the head of every
 * page all year, while each of these fonts is used during one month. The
 * browser requests such a font only when the hero of a themed page resolves
 * to it.
 *
 * All three fonts have one weight, 400.
 *
 * The loader of `next/font` accepts literal values only, thus the name of a
 * CSS variable stands in the call and again in the entry below it.
 */

const creepster = Creepster({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  variable: "--font-seasonal-creepster",
});

export const HALLOWEEN_FONT: SeasonalFont = {
  variableClassName: creepster.variable,
  cssVariableName: "--font-seasonal-creepster",
};

const mountainsOfChristmas = Mountains_of_Christmas({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  variable: "--font-seasonal-mountains-of-christmas",
});

export const CHRISTMAS_FONT: SeasonalFont = {
  variableClassName: mountainsOfChristmas.variable,
  cssVariableName: "--font-seasonal-mountains-of-christmas",
};

const monoton = Monoton({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  variable: "--font-seasonal-monoton",
});

export const NEW_YEAR_FONT: SeasonalFont = {
  variableClassName: monoton.variable,
  cssVariableName: "--font-seasonal-monoton",
};
