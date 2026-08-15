import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Mutations run as server actions against a worker stack under full-suite
 * load — their success feedback regularly needs more than the 5s default.
 */
export const ACTION_FEEDBACK_TIMEOUT = 15_000;

/**
 * The app's Modal (Base UI dialog) renders in a portal with role="dialog",
 * but its heading is not always a heading element — so modals are located
 * by their heading text instead of an accessible name.
 */
export const modal = (page: Page, heading: string | RegExp) =>
  page.getByRole("dialog").filter({ hasText: heading });

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

/** Retries the fill until the URL reflects it (nuqs-managed filters). */
export const fillUntilUrl = (
  page: Page,
  input: Locator,
  value: string,
  url: string | RegExp,
) =>
  expect(async () => {
    await input.fill(value);
    await expect(page).toHaveURL(url, { timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/**
 * EditableField wraps its display button and its save form in an inline
 * <span>; Playwright's hit-target validation misattributes clicks on them
 * to that span ("<span> intercepts pointer events") although real clicks
 * do reach the button — force skips only that validation. The reaction
 * check keeps the pre-hydration retry honest.
 */
export const openInlineEditor = (editButton: Locator, editorInput: Locator) =>
  expect(async () => {
    await editButton.click({ force: true, timeout: REACTION_TIMEOUT });
    await expect(editorInput).toBeVisible({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/** See openInlineEditor — the save button sits in the same inline wrapper. */
export const saveInlineEditor = (page: Page) =>
  page.locator('button[title="Speichern"]').click({ force: true });

/**
 * Proves the page has hydrated by opening and closing the notification
 * center popover, which sits in the top bar of every /app page and shares
 * the page's React root. Use this before single-shot interactions whose
 * only reaction is a server-action round trip — the retry helpers above
 * would fire such a mutation more than once.
 */
export const waitForAppShellHydration = async (page: Page) => {
  const bellButton = page.getByRole("button", { name: "Benachrichtigungen" });
  const popover = page.getByRole("dialog");
  await clickUntilVisible(bellButton, popover);
  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
};
