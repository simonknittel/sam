import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { clickUntilVisible } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const onboardingButton = (page: Page) =>
  page.getByRole("button", { name: "Erste Schritte" });

/** More Tab presses than a step card has tab stops: the focus must wrap */
const TAB_PRESS_COUNT = 8;

/**
 * Presses Tab and returns the name of each focused element. Fails when the
 * focus gets to an element of the page behind the tour. At the end of the
 * dialog, the browser can move the focus out of the document (then the body
 * is the active element) before it wraps to the start of the dialog.
 */
const tabThroughTour = async (page: Page) => {
  const focusedNames = new Set<string>();

  for (let pressCount = 0; pressCount < TAB_PRESS_COUNT; pressCount++) {
    await page.keyboard.press("Tab");

    const focus = await page.evaluate(() => {
      const focusedElement = document.activeElement;
      if (!focusedElement || focusedElement === document.body)
        return { isOnPage: false, name: null };

      return {
        isOnPage: !focusedElement.closest("dialog[open]"),
        name:
          focusedElement.getAttribute("title") ??
          focusedElement.textContent.trim(),
      };
    });

    expect(focus.isOnPage, `focused element: ${focus.name}`).toBe(false);
    if (focus.name) focusedNames.add(focus.name);
  }

  return focusedNames;
};

test("the tour keeps the keyboard focus, closes on Escape and returns the focus to its trigger", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "tastatur-tourist" });
  await signIn(citizen.user);

  await page.goto("/app");
  const popover = page.getByRole("dialog", { name: "Erste Schritte" });
  await clickUntilVisible(
    onboardingButton(page),
    popover.getByText("Lerne das SAM mit kurzen Touren kennen."),
  );
  await popover
    .getByRole("listitem")
    .filter({ hasText: "Aktiviere Browserbenachrichtigungen" })
    .getByRole("button", { name: "Starten" })
    .click();

  // A centered step without a target
  const introductionStep = page.getByRole("dialog", {
    name: "Benachrichtigungen des SAM",
  });
  await expect(
    introductionStep.getByRole("button", { name: "Weiter" }),
  ).toBeVisible();
  expect([...(await tabThroughTour(page))]).toEqual(
    expect.arrayContaining(["Tour beenden", "Weiter"]),
  );

  await introductionStep.getByRole("button", { name: "Weiter" }).click();

  // An anchored step on a different page
  await expect(page).toHaveURL(/\/app\/account\/notifications/);
  const enableStep = page.getByRole("dialog", {
    name: "Aktiviere die Benachrichtigungen",
  });
  await expect(
    enableStep.getByRole("button", { name: "Fertig" }),
  ).toBeVisible();
  expect([...(await tabThroughTour(page))]).toEqual(
    expect.arrayContaining(["Tour beenden", "Zurück", "Fertig"]),
  );

  await page.keyboard.press("Escape");
  await expect(enableStep).not.toBeVisible();
  await expect(onboardingButton(page)).toBeFocused();
});
