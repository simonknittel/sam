import type { Page } from "@playwright/test";
import { createCitizen, createUserWithoutCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  FORBIDDEN_TEXT,
  pickFromSearch,
  themeRoot,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const toolbarButton = (page: Page) =>
  page.getByRole("button", { name: /^Admin tools/ });

const toolbarPanel = (page: Page) =>
  page.getByRole("dialog", { name: "Admin tools" });

/**
 * Each tool of the panel runs its action once and reloads the page, thus a
 * click in the panel needs no retry: the panel opens only after hydration.
 */
const openToolbar = (page: Page) =>
  clickUntilVisible(toolbarButton(page), toolbarPanel(page));

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

  // The tool fully reloads the page so the forbidden() boundary re-renders
  // with the new cookie
  await openToolbar(page);
  await toolbarPanel(page)
    .getByRole("button", { name: "Enable admin" })
    .click();
  await expect(page.getByText("Zeitraum:")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText(FORBIDDEN_TEXT)).not.toBeVisible();
  await expect(toolbarButton(page)).toContainText("Admin mode");

  // Disabling restores the redaction
  await openToolbar(page);
  await toolbarPanel(page)
    .getByRole("button", { name: "Disable admin" })
    .click();
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(toolbarButton(page)).not.toContainText("Admin mode");
});

test("assuming a user switches the effective citizen and names the admin in the system log", async ({
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

  await openToolbar(page);
  await pickFromSearch(
    page,
    toolbarPanel(page).getByRole("combobox", { name: "User" }),
    "zielnutzer",
  );

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
  await expect(toolbarButton(page)).not.toContainText("Admin mode");

  // Exit returns to the admin's own (non-admin-mode) session
  await waitForAppShellHydration(page);
  await page.getByRole("button", { name: "Exit" }).click();
  await expect(page.getByText("Assuming zielnutzer")).not.toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await openToolbar(page);
  await expect(
    toolbarPanel(page).getByRole("button", { name: "Enable admin" }),
  ).toBeVisible();

  // While assuming, every other event names the assumed user, thus these
  // two must name the admin
  const events = await prisma.auditEvent.findMany({
    where: { type: { in: ["ASSUME_USER_STARTED", "ASSUME_USER_ENDED"] } },
    orderBy: { createdAt: "asc" },
    select: { type: true, createdById: true, data: true },
  });
  const assumedUser = {
    assumedUserId: target.user.id,
    assumedUserName: "zielnutzer",
  };
  expect(
    events.map((event) => ({ ...event, data: JSON.parse(String(event.data)) })),
  ).toEqual([
    {
      type: "ASSUME_USER_STARTED",
      createdById: admin.user.id,
      data: assumedUser,
    },
    {
      type: "ASSUME_USER_ENDED",
      createdById: admin.user.id,
      data: assumedUser,
    },
  ]);
});

test("the seasonal theme tool sets and removes the date of the themes", async ({
  page,
  context,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "systemadmin",
    admin: true,
  });

  await signIn(admin.user);
  await page.goto("/app/account/profile");

  await openToolbar(page);
  await toolbarPanel(page)
    .getByRole("button", { name: "Halloween greeting" })
    .click();
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "halloween",
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(toolbarButton(page)).toContainText("Halloween");

  await openToolbar(page);
  await toolbarPanel(page).getByLabel("Date").fill("2026-12-24");
  await toolbarPanel(page).getByRole("button", { name: "Set date" }).click();
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "christmas",
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(toolbarButton(page)).toContainText("Weihnachten 2026-12-24");

  await openToolbar(page);
  await toolbarPanel(page).getByRole("button", { name: "No theme" }).click();
  await expect(themeRoot(page)).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(toolbarButton(page)).toContainText("No theme");

  // What "Auto" shows depends on the real date, thus only the override goes
  await openToolbar(page);
  await toolbarPanel(page)
    .getByRole("button", { name: "Auto (today)" })
    .click();
  await expect(toolbarButton(page)).not.toContainText("No theme", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const cookies = await context.cookies();
  expect(cookies.map((cookie) => cookie.name)).not.toContain("seasonal-date");
});

test("the seasonal theme tool works while the admin assumes a user who switched the event off", async ({
  page,
  context,
  prisma,
  signIn,
  setSeasonalDate,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "systemadmin",
    admin: true,
  });
  const target = await createCitizen(prisma, { handle: "themenmuffel" });
  await prisma.seasonalThemeSetting.create({
    data: { citizenId: target.entity.id, eventKey: "halloween" },
  });

  await signIn(admin.user);
  await context.addCookies([
    {
      name: "assume_user",
      value: target.user.id,
      domain: "localhost",
      path: "/",
    },
  ]);
  await setSeasonalDate("2026-10-15");
  await page.goto("/app/account/profile");

  // The opt-out of the assumed user applies also to an override date
  await expect(page.getByText("Assuming themenmuffel")).toBeVisible();
  await expect(themeRoot(page)).toHaveCount(0);

  await openToolbar(page);
  const panel = toolbarPanel(page);
  await expect(
    panel.getByText("Hidden: the viewer switched this event off."),
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: "Enable admin" })).toHaveCount(
    0,
  );

  await panel.getByRole("button", { name: "Weihnachten", exact: true }).click();
  await expect(themeRoot(page)).toHaveAttribute(
    "data-seasonal-event",
    "christmas",
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(page.getByText("Assuming themenmuffel")).toBeVisible();
});

test("the toolbar works on the clearance page", async ({
  page,
  prisma,
  signIn,
}) => {
  // Without a citizen, only admin mode gets the admin past the gate
  const admin = await createUserWithoutCitizen(prisma, {
    name: "gateadmin",
    admin: true,
  });
  await createCitizen(prisma, { handle: "zielnutzer" });

  await signIn(admin);
  await page.goto("/app");
  await expect(
    page.getByText("Bitte melde dich bei Human Resources"),
  ).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page).toHaveURL("/clearance");

  await openToolbar(page);
  const panel = toolbarPanel(page);

  // The list of users loads without clearance
  await panel.getByRole("combobox", { name: "User" }).fill("zielnutzer");
  await expect(page.getByRole("option", { name: "zielnutzer" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await panel.getByRole("button", { name: "Enable admin" }).click();
  await expect(toolbarButton(page)).toContainText("Admin mode", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page).toHaveURL("/app/dashboard");
});

test("only an admin gets the toolbar and the list of users", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "normalo" });

  await signIn(citizen.user);
  await page.goto("/app/dashboard");
  await waitForAppShellHydration(page);

  await expect(toolbarButton(page)).toHaveCount(0);

  const response = await page.request.get("/api/trpc/users.getAssumableUsers");
  expect(response.status()).toBe(403);
});
