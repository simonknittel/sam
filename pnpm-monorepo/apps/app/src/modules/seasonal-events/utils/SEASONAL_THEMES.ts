import "server-only";

import { SeasonalEventKey } from "@sam-monorepo/domain";
import { ChristmasHeroOrnament } from "../components/christmas/HeroOrnament";
import { ChristmasSpynetSearchTileDecoration } from "../components/christmas/SpynetSearchTileDecoration";
import { ChristmasTopBarDecoration } from "../components/christmas/TopBarDecoration";
import { ChristmasViewportDecoration } from "../components/christmas/ViewportDecoration";
import { HalloweenHeroOrnament } from "../components/halloween/HeroOrnament";
import { HalloweenSpynetSearchTileDecoration } from "../components/halloween/SpynetSearchTileDecoration";
import { HalloweenTopBarDecoration } from "../components/halloween/TopBarDecoration";
import { HalloweenViewportDecoration } from "../components/halloween/ViewportDecoration";
import { NewYearHeroOrnament } from "../components/new-year/HeroOrnament";
import { NewYearSpynetSearchTileDecoration } from "../components/new-year/SpynetSearchTileDecoration";
import { NewYearTopBarDecoration } from "../components/new-year/TopBarDecoration";
import { NewYearViewportDecoration } from "../components/new-year/ViewportDecoration";
import { CHRISTMAS_WORDINGS } from "../wordings/christmas";
import { HALLOWEEN_WORDINGS } from "../wordings/halloween";
import { NEW_YEAR_WORDINGS } from "../wordings/newYear";
import { CHRISTMAS_FONT, HALLOWEEN_FONT, NEW_YEAR_FONT } from "./fonts";
import type { SeasonalTheme } from "./types";

/**
 * Everything the app draws for a seasonal event. The record is exhaustive
 * over the event keys of the calendar, thus a new event of the calendar
 * without a theme is a compile error.
 *
 * A further event needs one entry here with its own assets and one entry in
 * the calendar of the domain package. Nothing else changes.
 *
 * Server-only: the entries hold server components and the fonts of
 * `next/font/google`, and none of them belongs into the payload of a page.
 */
export const SEASONAL_THEMES: Record<SeasonalEventKey, SeasonalTheme> = {
  [SeasonalEventKey.Halloween]: {
    title: "Halloween",
    font: HALLOWEEN_FONT,
    wordings: HALLOWEEN_WORDINGS,
    bannerSurfaceClassName: "background-halloween",
    hasConfetti: false,
    TopBarDecoration: HalloweenTopBarDecoration,
    ViewportDecoration: HalloweenViewportDecoration,
    SpynetSearchTileDecoration: HalloweenSpynetSearchTileDecoration,
    HeroOrnament: HalloweenHeroOrnament,
  },
  [SeasonalEventKey.Christmas]: {
    title: "Weihnachten",
    font: CHRISTMAS_FONT,
    wordings: CHRISTMAS_WORDINGS,
    bannerSurfaceClassName: "background-christmas",
    hasConfetti: false,
    TopBarDecoration: ChristmasTopBarDecoration,
    ViewportDecoration: ChristmasViewportDecoration,
    SpynetSearchTileDecoration: ChristmasSpynetSearchTileDecoration,
    HeroOrnament: ChristmasHeroOrnament,
  },
  [SeasonalEventKey.NewYear]: {
    title: "Neujahr",
    font: NEW_YEAR_FONT,
    wordings: NEW_YEAR_WORDINGS,
    bannerSurfaceClassName: "background-new-year",
    hasConfetti: true,
    TopBarDecoration: NewYearTopBarDecoration,
    ViewportDecoration: NewYearViewportDecoration,
    SpynetSearchTileDecoration: NewYearSpynetSearchTileDecoration,
    HeroOrnament: NewYearHeroOrnament,
  },
};
