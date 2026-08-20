import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Mutations run as server actions against a worker stack under full-suite
 * load — their success feedback regularly needs more than the 5s default.
 */
export const ACTION_FEEDBACK_TIMEOUT = 15_000;

/**
 * The app's Modal (Base UI dialog) renders in a portal with role="dialog"
 * and takes its accessible name from the heading it is given. Popovers use
 * the same role but carry their own name, so this never matches one.
 */
export const modal = (page: Page, heading: string | RegExp) =>
  page.getByRole("dialog", { name: heading });

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

/**
 * A fill swallowed by the hydration race still leaves its value in the DOM,
 * and React adopts exactly that value into the input's value tracker while
 * hydrating. Every later fill of the same value is then a no-op as far as
 * React is concerned — no change event, no state update — so a plain retry
 * loop can never recover and burns the full HYDRATION_TIMEOUT instead.
 * Clearing the leftover first turns the retry back into a real value
 * transition. Only done when the value is already there, so filling a field
 * that holds something else stays a single edit.
 */
const refill = async (input: Locator, value: string) => {
  if ((await input.inputValue()) === value) await input.fill("");
  await input.fill(value);
};

/** Retries the fill until the reaction becomes visible. */
export const fillUntilVisible = (
  input: Locator,
  value: string,
  reaction: Locator,
) =>
  expect(async () => {
    await refill(input, value);
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
    await refill(input, value);
    await expect(page).toHaveURL(url, { timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/**
 * Key presses are swallowed before hydration just like clicks, but blindly
 * retrying a Tab would walk past the element under test. Pressing only while
 * the body still holds focus keeps every attempt at the start of the tab
 * order, so this can never advance more than one stop.
 */
export const tabUntilFocused = (page: Page, target: Locator) =>
  expect(async () => {
    if (await page.evaluate(() => document.activeElement === document.body)) {
      await page.keyboard.press("Tab");
    }
    await expect(target).toBeFocused({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/**
 * Submits the open inline editor (EditableField). Only one can be open at a
 * time, so the icon-only save button is unambiguous without scoping.
 */
export const saveInlineEditor = (page: Page) =>
  page.locator('button[title="Speichern"]').click();

/**
 * Proves the page has hydrated by opening and closing the notification
 * center popover, which sits in the top bar of every /app page and shares
 * the page's React root. Use this before single-shot interactions whose
 * only reaction is a server-action round trip — the retry helpers above
 * would fire such a mutation more than once.
 */
export const waitForAppShellHydration = async (page: Page) => {
  const bellButton = page.getByRole("button", { name: "Benachrichtigungen" });
  const popover = page.getByRole("dialog", { name: "Benachrichtigungen" });
  await clickUntilVisible(bellButton, popover);
  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
};
