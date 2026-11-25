import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The assertion timeout of the suite (`expect.timeout` in
 * playwright.config.ts). Mutations run as server actions against a worker
 * stack under full-suite load, thus their success feedback frequently needs
 * more than the 5s default.
 */
export const ACTION_FEEDBACK_TIMEOUT = 15_000;

/**
 * Writes that travel through the collab server reach the database on its 2s
 * store debounce, and a page load has to happen first — so every assertion
 * on persisted editor content polls for this long.
 */
export const COLLAB_PERSISTENCE_TIMEOUT = 20_000;

/** Text of both 403 boundaries: app/app/forbidden.tsx and ForbiddenCard. */
export const FORBIDDEN_TEXT = "Du bist nicht berechtigt dies zu sehen.";

export const NOT_FOUND_TEXT = "Page not found";

export const SAVED_TEXT = "Erfolgreich gespeichert";
export const DELETED_TEXT = "Erfolgreich gelöscht";
/** The `Common.notFound` message of an action, not the 404 page */
export const RESOURCE_NOT_FOUND_TEXT =
  "Die gesuchte Ressource wurde nicht gefunden.";
/** The `Common.forbidden` message of an action, not the 403 page */
export const FORBIDDEN_ACTION_TEXT =
  "Du bist nicht berechtigt diese Aktion auszuführen.";
/** The `Common.badRequest` message of an action */
export const BAD_REQUEST_TEXT = "Ungültige Anfrage";

export const sectionByHeading = (page: Page, heading: string | RegExp) =>
  page.locator("section").filter({
    has: page.getByRole("heading", {
      name: heading,
      exact: typeof heading === "string",
    }),
  });

/**
 * A StatisticTile has no heading, so the tile is the parent of its label. The
 * value animates through random digits (ScrambleIn), but an sr-only span holds
 * the real one from the start, which toContainText reads.
 */
export const statisticTile = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator("..");

/**
 * The dialog takes its name from its heading. Popovers have the same role, but
 * their own name.
 */
export const modal = (page: Page, heading: string | RegExp) =>
  page.getByRole("dialog", { name: heading });

export const openPositionCitizenModal = async (
  page: Page,
  positionName: string,
) => {
  const dialog = modal(page, "Posten zuweisen");
  await clickUntilVisible(
    page.getByRole("button", { name: `Citizen für ${positionName}:` }),
    dialog,
  );
  return dialog;
};

/** A section is for example "Alle Teilnehmer - Voraussetzungen erfüllt". */
export const positionCitizenChoice = (
  dialog: Locator,
  sectionTitle: string,
  citizenName: string,
) =>
  dialog
    .getByRole("region", { name: sectionTitle, exact: true })
    .getByRole("listitem")
    .filter({ hasText: citizenName });

export const themeRoot = (page: Page) => page.locator("[data-seasonal-event]");

/**
 * The helpers below retry the interaction until its reaction shows up (see the
 * README). Prefer them over hand-rolled `toPass` loops, so that the workaround
 * stays in one place.
 */

const REACTION_TIMEOUT = 2_000;
const HYDRATION_TIMEOUT = 15_000;

export const clickUntilVisible = (target: Locator, reaction: Locator) =>
  expect(async () => {
    await target.click({ timeout: REACTION_TIMEOUT });
    await expect(reaction).toBeVisible({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/**
 * For the popovers which only open on hover (`hoverOnly`), where a click would
 * do nothing.
 */
export const hoverUntilVisible = (target: Locator, reaction: Locator) =>
  expect(async () => {
    /**
     * A hover of the point where the pointer already is fires no pointer
     * events, thus a retry after a hover before the hydration would never
     * reach the hydrated trigger. The pointer leaves the target first.
     */
    await target.page().mouse.move(0, 0);
    await target.hover({ timeout: REACTION_TIMEOUT });
    await expect(reaction).toBeVisible({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

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

export const fillUntilVisible = (
  input: Locator,
  value: string,
  reaction: Locator,
) =>
  expect(async () => {
    await refill(input, value);
    await expect(reaction).toBeVisible({ timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/**
 * Forms whose other controls re-render while they load — the citizen pickers
 * above a value field, say — drop a fill that lands in that window, and the
 * form then submits its default instead.
 */
export const fillUntilValue = (input: Locator, value: string) =>
  expect(async () => {
    await refill(input, value);
    await expect(input).toHaveValue(value, { timeout: REACTION_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

/** The list of a multi-select filter stays open after the click. */
export const pickFilterOption = async (
  page: Page,
  filterLabel: string,
  optionName: string,
) => {
  const option = page.getByRole("option", { name: optionName, exact: true });
  await fillUntilVisible(
    page.getByRole("combobox", { name: filterLabel }),
    optionName,
    option,
  );
  await option.click();
};

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

export const inlineEditorTrigger = (scope: Page | Locator) =>
  scope.getByTitle("Klicken, um zu bearbeiten");

/**
 * Only one EditableField can be open at a time, thus the save button needs no
 * scope.
 */
export const saveInlineEditor = (page: Page) =>
  page.getByTitle("Speichern").click();

/**
 * The label of a switch or checkbox, found by its text or by the input inside
 * it. The inputs are `sr-only`, so a click on one is blocked by the styled span
 * drawn in front of it. Only the visible label, because of the copies of a
 * streaming page (see the README).
 */
export const toggleLabel = (
  scope: Page | Locator,
  labelOrInput: string | RegExp | Locator,
) =>
  scope
    .locator("label")
    .filter(
      typeof labelOrInput === "string" || labelOrInput instanceof RegExp
        ? { hasText: labelOrInput }
        : { has: labelOrInput },
    )
    .filter({ visible: true });

export const formSection = (scope: Page | Locator, heading: string) => {
  /** The inner locator of `has` starts at the root, not at the scope */
  const page = "goto" in scope ? scope : scope.page();

  return scope.locator("details").filter({
    has: page.locator("summary").getByText(heading, { exact: true }),
  });
};

/**
 * The section is a native `details` element, thus it opens also before the
 * hydration.
 */
export const openFormSection = async (
  scope: Page | Locator,
  heading: string,
) => {
  const section = formSection(scope, heading);
  await section.locator("summary").click();
  await expect(section).toHaveAttribute("open");
};

/**
 * Picks an entry from one of the app's search pickers (citizens, users). The
 * list of the citizens needs `citizen;read`. The options of the citizen picker
 * are in a portal, and an option also has the id or the email of its entry,
 * thus the lookup is on the page and by substring.
 */
export const pickFromSearch = async (
  page: Page,
  combobox: Locator,
  handle: string,
) => {
  /** The citizen picker shows its input after its list loaded through tRPC */
  await expect(combobox).toBeVisible();
  await combobox.fill(handle);

  const option = page.getByRole("option", { name: handle });
  await expect(option).toBeVisible();
  await option.click();

  /**
   * One animation frame after the pick, the picker moves the focus back to
   * its input. A fill of the next field before that frame loses its text to
   * the picker.
   */
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
};

/** The value of a date input */
export const toDateValue = (date: Date) => date.toISOString().slice(0, 10);

/** Only one popover is open at a time, thus it needs no scope. */
export const rolePickerPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Rolle auswählen" });

/** Exact, because a role name can be a part of a different role name. */
export const rolePickerOption = (popover: Locator, roleName: string) =>
  popover.getByRole("option", { name: roleName, exact: true });

/**
 * A click filters the list to the roles of the tag, and a second click clears
 * the filter.
 */
export const rolePickerTag = (popover: Locator, tagName: string) =>
  popover.getByRole("button", { name: tagName, exact: true });

/** The selected roles under the trigger of a role picker in multiple mode */
export const rolePickerChips = (scope: Page | Locator) =>
  scope.getByTitle("Rolle entfernen");

/**
 * In single mode with a selection, the trigger has the name of the selected
 * role.
 */
export const openRolePicker = async (trigger: Locator) => {
  const popover = rolePickerPopover(trigger.page());
  await clickUntilVisible(trigger, popover);
  return popover;
};

/** The scope is the popover or the dialog that holds the panel. */
export const rolePickerSearchField = (scope: Locator) =>
  scope.getByRole("combobox", { name: "Rolle oder Tag suchen …" });

export const searchRolePicker = (popover: Locator, query: string) =>
  rolePickerSearchField(popover).fill(query);

export const variantPickerPopover = (page: Page) =>
  page.getByRole("dialog", { name: "Schiff auswählen" });

export const variantPickerSearchField = (scope: Locator) =>
  scope.getByRole("combobox", { name: "Schiff, Hersteller oder Tag suchen …" });

export const closeRolePicker = async (popover: Locator) => {
  await popover.page().keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
};

/**
 * Each role must not be selected yet, because a click on a selected role
 * deselects it.
 */
export const pickRoles = async (
  trigger: Locator,
  roleNames: readonly string[],
) => {
  const popover = await openRolePicker(trigger);

  for (const roleName of roleNames) {
    const option = rolePickerOption(popover, roleName);
    await option.click();
    await expect(option).toHaveAttribute("aria-selected", "true");
  }

  await closeRolePicker(popover);
};

export const pickRole = async (trigger: Locator, roleName: string) => {
  const popover = await openRolePicker(trigger);
  await rolePickerOption(popover, roleName).click();
  await expect(popover).not.toBeVisible();
};

/**
 * The role selectors of Playwright ignore `inert` and the inert page behind a
 * modal dialog, thus this reads the accessibility tree of Chromium itself,
 * which screen readers get.
 */
export const accessibilityTree = async (page: Page) => {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    return nodes.flatMap((node) =>
      node.ignored
        ? []
        : [
            {
              role: String(node.role?.value ?? ""),
              name: String(node.name?.value ?? ""),
            },
          ],
    );
  } finally {
    await session.detach();
  }
};

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Playwright has no touch swipe, thus the gesture goes through the Chrome
 * DevTools Protocol.
 */
export const swipe = async (page: Page, from: Point, to: Point) => {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [from],
    });
    const stepCount = 10;
    for (let step = 1; step <= stepCount; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * step) / stepCount,
            y: from.y + ((to.y - from.y) * step) / stepCount,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
};

export const dateParam = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The notification center sits in the top bar of every /app page and shares the
 * page's React root. Use this before single-shot interactions whose only
 * reaction is a server-action round trip — the retry helpers above would fire
 * such a mutation more than once.
 */
export const waitForAppShellHydration = async (page: Page) => {
  const bellButton = page.getByRole("button", { name: "Benachrichtigungen" });
  const popover = page.getByRole("dialog", { name: "Benachrichtigungen" });
  await clickUntilVisible(bellButton, popover);
  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
};

/**
 * A production build names a hydration error only with its number, for
 * example "Minified React error #418" (https://react.dev/errors/418).
 */
const isHydrationError = (message: string) =>
  /hydrat|react\.dev\/errors\/(418|423|425)\b/i.test(message);

/**
 * React writes hydration errors to the console or reports them as uncaught
 * errors. Start the collection before the navigation, and examine the list
 * after the hydration.
 */
export const collectHydrationErrors = (page: Page) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && isHydrationError(message.text()))
      hydrationErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (isHydrationError(String(error))) hydrationErrors.push(String(error));
  });
  return hydrationErrors;
};
