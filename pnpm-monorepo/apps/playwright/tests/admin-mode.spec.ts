import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  FORBIDDEN_TEXT,
  pickFromSearch,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("an admin's pages stay redacted until admin mode is enabled", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "systemadmin",
    admin: true,
  });

  await signIn(admin.user);
  await page.goto("/app/statistics");

  // Without the cookie the admin is an ordinary user
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Only the exact value counts — a truthy-looking one changes nothing
  await page
    .context()
    .addCookies([
      { name: "enable_admin", value: "true", domain: "localhost", path: "/" },
    ]);
  await page.reload();
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // The button fully reloads the page so the forbidden() boundary
  // re-renders with the new cookie
  await waitForAppShellHydration(page);
  await page.getByRole("button", { name: "Enable admin" }).click();
  await expect(page.getByRole("button", { name: "Disable admin" })).toBeVisible(
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(page.getByText("Zeitraum:")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText(FORBIDDEN_TEXT)).not.toBeVisible();

  // Disabling restores the redaction
  await page.getByRole("button", { name: "Disable admin" }).click();
  await expect(page.getByRole("button", { name: "Enable admin" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
});

test("assuming a user switches the effective citizen", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "systemadmin",
    admin: true,
  });
  const target = await createCitizen(prisma, { handle: "zielnutzer" });

  await signIn(admin.user);
  await enableAdminMode();
  await page.goto("/app/dashboard");

  const userSearch = page.getByRole("combobox", { name: "User" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Assume user" }),
    userSearch,
  );
  await pickFromSearch(page, userSearch, "zielnutzer");

  await expect(page.getByText("Assuming zielnutzer")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  // The dashboard profile now belongs to the assumed citizen
  await expect(page.getByRole("heading", { name: "zielnutzer" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Assuming clears admin mode, so the assumed user's permissions rule
  await page.goto("/app/statistics");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Exit returns to the admin's own (non-admin-mode) session
  await page.getByRole("button", { name: "Exit" }).click();
  await expect(page.getByText("Assuming zielnutzer")).not.toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("button", { name: "Enable admin" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
});
