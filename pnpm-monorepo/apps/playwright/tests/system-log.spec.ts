import { createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  fillUntilUrl,
  FORBIDDEN_TEXT,
  modal,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const dateParam = (date: Date) => date.toISOString().slice(0, 10);

test("a freshly emitted event renders and the filters narrow the table", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "protokollant",
    permissionStrings: ["systemLog;read", "role;manage"],
  });
  const otherUser = await createCitizen(prisma, { handle: "zweitnutzer" });

  // An older event by another user, to give the filters something to drop
  await prisma.auditEvent.create({
    data: {
      type: "MANUFACTURER_CREATED",
      data: { manufacturerId: "hersteller-1", name: "Drake" },
      createdById: otherUser.user.id,
      createdAt: new Date(Date.now() - 10 * ONE_DAY_MS),
    },
  });

  await signIn(admin.user);

  // Emit a fresh event through the UI
  await page.goto("/app/iam/roles");
  const roleModal = modal(page, "Neue Rolle");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neue Rolle" }),
    roleModal,
  );
  await roleModal.getByLabel("Name").fill("Aufklärer");
  await roleModal.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich hinzugefügt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // Both events render with type and human-readable message
  await page.goto("/app/system-log");
  await expect(page.getByText('Role created: "Aufklärer"')).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).toBeVisible();
  await expect(page.getByText("MANUFACTURER_CREATED")).toBeVisible();

  // The time-range filter drops the old event
  const fromDate = dateParam(new Date(Date.now() - 5 * ONE_DAY_MS));
  await fillUntilUrl(
    page,
    page.getByLabel("Von"),
    fromDate,
    new RegExp(`from=${fromDate}`),
  );
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).not.toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByText('Role created: "Aufklärer"')).toBeVisible();

  // The type filter keeps only the selected type
  await page.goto("/app/system-log?type=MANUFACTURER_CREATED");
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByText('Role created: "Aufklärer"')).toHaveCount(0);

  // The user filter keeps only the selected creator's events
  await page.goto(`/app/system-log?createdById=${otherUser.user.id}`);
  await expect(
    page.getByText("Manufacturer Drake created (hersteller-1)"),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByText('Role created: "Aufklärer"')).toHaveCount(0);
});

test("the system log is forbidden without the permission", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "unbefugter" });

  await signIn(citizen.user);
  await page.goto("/app/system-log");

  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
});
