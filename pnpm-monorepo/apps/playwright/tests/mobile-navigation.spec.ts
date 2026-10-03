import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { clickUntilUrl, clickUntilVisible } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test.use({ viewport: { width: 390, height: 844 } });

/**
 * The texts that Chromium gives to screen readers. The role selectors of
 * Playwright ignore `inert`, thus this reads the accessibility tree of the
 * browser itself.
 */
const textsForScreenReaders = async (page: Page) => {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    return nodes.flatMap((node) =>
      !node.ignored && typeof node.name?.value === "string"
        ? [node.name.value]
        : [],
    );
  } finally {
    await session.detach();
  }
};

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
