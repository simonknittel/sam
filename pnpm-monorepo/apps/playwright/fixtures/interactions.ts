import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Interactions landing before React hydrates are swallowed: clicks fall on
 * dead DOM and fill() never reaches a controlled input's state. These
 * helpers retry the interaction until its expected reaction shows up. The
 * underlying hydration race is a product issue (tracked in the maintenance
 * backlog) — new tests should prefer these helpers over hand-rolled
 * `toPass` loops so the workaround stays in one place.
 */

const REACTION_TIMEOUT = 2_000;
const HYDRATION_TIMEOUT = 15_000;

/** Retries the click until the reaction becomes visible. */
export const clickUntilVisible = (target: Locator, reaction: Locator) =>
  expect(async () => {
    await target.click({ timeout: REACTION_TIMEOUT });
    await expect(reaction).toBeVisible({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/** Retries the click until the navigation actually happens. */
export const clickUntilUrl = (
  page: Page,
  target: Locator,
  url: string | RegExp,
) =>
  expect(async () => {
    await target.click({ timeout: REACTION_TIMEOUT });
    await expect(page).toHaveURL(url, { timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/** Retries the fill until the reaction becomes visible. */
export const fillUntilVisible = (
  input: Locator,
  value: string,
  reaction: Locator,
) =>
  expect(async () => {
    await input.fill(value);
    await expect(reaction).toBeVisible({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
