import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import {
  accessibilityTree,
  clickUntilUrl,
  clickUntilVisible,
  collectHydrationErrors,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test.use({ viewport: { width: 390, height: 844 } });

/** The texts that screen readers get */
const textsForScreenReaders = async (page: Page) =>
  (await accessibilityTree(page)).map((node) => node.name);

/** Whether the focus is inside the element that the toggle controls */
const isFocusInControlledElement = (toggle: Locator) =>
  toggle.evaluate((button) => {
    const controlledElement = document.getElementById(
      button.getAttribute("aria-controls") ?? "",
    );
    if (!controlledElement) throw new Error("aria-controls names no element");
    return controlledElement.contains(document.activeElement);
  });

/** The element that a toggle button shows and hides (its aria-controls) */
const controlledElement = async (toggle: Locator) => {
  const id = await toggle.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  return toggle.page().locator(`[id="${id}"]`);
};

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A swipe with a finger. Playwright has no touch swipe, thus the gesture
 * goes through the Chrome DevTools Protocol (as `sortByTouch`).
 */
const swipe = async (page: Page, from: Point, to: Point) => {
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

test("the closed flyout is out of reach and Escape closes the open one", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "flyout-nutzer" });
  await signIn(citizen.user);
  /** Not "/app": its redirect can replace the document during the test */
  await page.goto("/app/dashboard");

  const actionBar = page.locator("nav");
  const toggle = actionBar.getByRole("button", { name: "Apps" });
  const isFocusInFlyout = () => isFocusInControlledElement(toggle);

  /** Closed: neither the keyboard nor a screen reader reaches the content */
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() => textsForScreenReaders(page))
    .not.toContain("Featured");
  await toggle.focus();
  await page.keyboard.press("Tab");
  await expect.poll(isFocusInFlyout).toBe(false);

  /** Open: the content is the next stop of the tab order */
  await clickUntilVisible(
    toggle,
    actionBar.getByRole("button", { name: "Apps", expanded: true }),
  );
  await expect.poll(() => textsForScreenReaders(page)).toContain("Featured");
  await toggle.focus();
  await page.keyboard.press("Tab");
  await expect.poll(isFocusInFlyout).toBe(true);

  /** Escape closes the flyout and moves the focus back to its toggle */
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await expect
    .poll(() => textsForScreenReaders(page))
    .not.toContain("Featured");
});

test("the navigation and the filter toggles tell their state", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "toggle-nutzer" });
  await signIn(citizen.user);
  await page.goto("/app/account/profile");

  /** On a narrow screen the toggle shows only its icon, but keeps its name */
  const navigationToggle = page.getByRole("button", {
    name: "Navigation",
    exact: true,
  });
  const navigation = await controlledElement(navigationToggle);
  await expect(navigationToggle).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toBeHidden();

  await clickUntilVisible(navigationToggle, navigation);
  await expect(navigationToggle).toHaveAttribute("aria-expanded", "true");

  /** The navigation lives in the layout, but closes after a followed link */
  await clickUntilUrl(
    page,
    navigation.getByRole("link", { name: "Sitzungen" }),
    /\/app\/account\/sessions$/,
  );
  await expect(navigation).toBeHidden();
  await expect(navigationToggle).toHaveAttribute("aria-expanded", "false");

  const filterToggle = page.getByRole("button", {
    name: "Filter",
    exact: true,
  });
  const filters = await controlledElement(filterToggle);
  await expect(filterToggle).toHaveAttribute("aria-expanded", "false");
  await expect(filters).toBeHidden();

  await clickUntilVisible(filterToggle, filters);
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
});

test("swipes open and close the flyout, but not from the outer edge", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "wisch-nutzer" });
  await signIn(citizen.user);
  await page.goto("/app/dashboard");

  const actionBar = page.locator("nav");
  const toggle = actionBar.getByRole("button", { name: "Apps" });

  /** The swipe works only after the action bar hydrated */
  await expect(async () => {
    await swipe(page, { x: 50, y: 400 }, { x: 320, y: 420 });
    await expect(toggle).toHaveAttribute("aria-expanded", "true", {
      timeout: 1_000,
    });
  }).toPass();

  /** The avatar and the name replace the account button */
  await expect(
    actionBar.getByRole("link", { name: "wisch-nutzer", exact: true }),
  ).toHaveAttribute("href", "/app/account");

  await swipe(page, { x: 300, y: 400 }, { x: 60, y: 410 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  /** The outer pixels belong to the swipe-back gesture of the browser */
  await swipe(page, { x: 10, y: 400 }, { x: 320, y: 400 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("admin mode shows the Events and Tasks links of an admin without a hydration error", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  /** Only admin mode gives this admin the permissions for the two links */
  const admin = await createCitizen(prisma, {
    handle: "mobil-admin",
    admin: true,
  });
  await signIn(admin.user);
  await enableAdminMode();

  const hydrationErrors = collectHydrationErrors(page);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/dashboard$/);

  const actionBar = page
    .locator("nav")
    .filter({ has: page.getByRole("button", { name: "Apps" }) });
  /** The links of the bar itself, without the app links in its flyout */
  const barLinks = actionBar.locator(":scope > ul > li > a");
  await expect(barLinks).toHaveText(["Dashboard", "Events", "Tasks", "Wiki"]);

  /** The action bar hydrates in its own Suspense boundary */
  await clickUntilVisible(
    actionBar.getByRole("button", { name: "Apps" }),
    actionBar.getByRole("button", { name: "Apps", expanded: true }),
  );
  expect(hydrationErrors).toEqual([]);
});
