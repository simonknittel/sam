import { createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  fillUntilUrl,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const dateParam = (date: Date) => date.toISOString().slice(0, 10);

/**
 * That an action's audit event ends up rendered here is asserted where the
 * action lives (see the spynet settings and SILC specs). This spec owns the
 * table itself, so it seeds its rows instead of driving a foreign UI.
 */
test("the log renders its events and the filters narrow the table", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "protokollant",
    permissionStrings: ["systemLog;read"],
  });
  const otherUser = await createCitizen(prisma, { handle: "zweitnutzer" });
  const role = await createCitizen(prisma, { handle: "rollen-halter" });

  await prisma.auditEvent.createMany({
    data: [
      // An older event by another user, to give the filters something to drop
      {
        type: "MANUFACTURER_CREATED",
        data: JSON.stringify({
          manufacturerId: "hersteller-1",
          name: "Drake",
        }),
        createdById: otherUser.user.id,
        createdAt: new Date(Date.now() - 10 * ONE_DAY_MS),
      },
      {
        type: "ROLE_CREATED",
        data: JSON.stringify({ roleId: role.role.id, name: "Aufklärer" }),
        createdById: admin.user.id,
      },
    ],
  });

  await signIn(admin.user);
  await page.goto("/app/system-log");

  // Both events render with their type and their human-readable message
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
