import type { Page } from "@playwright/test";
import { NotificationChannel } from "@sam-monorepo/database/client";
import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The checkbox inputs are sr-only without an accessible name — they are
 * located by their form field name (ONSITE_<type> / WEB_PUSH_<type>) and
 * toggled through their wrapping label.
 */
const browserCheckbox = (page: Page, notificationType: string) =>
  page.locator(`input[name="WEB_PUSH_${notificationType}"]`);

const browserCheckboxLabel = (page: Page, notificationType: string) =>
  page
    .locator("label")
    .filter({ has: browserCheckbox(page, notificationType) });

test("enabling a browser notification persists the setting", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "notification-tuner" });
  await signIn(citizen.user);

  await page.goto("/app/account/notifications");
  await waitForAppShellHydration(page);

  await expect(browserCheckbox(page, "event_created")).not.toBeChecked();
  await browserCheckboxLabel(page, "event_created").click();
  await expect(browserCheckbox(page, "event_created")).toBeChecked();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const settings = await prisma.notificationSetting.findMany({
    where: { citizenId: citizen.entity.id },
  });
  expect(settings).toHaveLength(1);
  expect(settings[0]).toMatchObject({
    notificationType: "event_created",
    channel: NotificationChannel.WEB_PUSH,
  });

  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "NOTIFICATION_SETTINGS_UPDATED" },
  });
  expect(auditEvent).not.toBeNull();
});

test("disabling a browser notification deletes the setting", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "notification-muter" });
  await prisma.notificationSetting.create({
    data: {
      citizenId: citizen.entity.id,
      notificationType: "event_created",
      channel: NotificationChannel.WEB_PUSH,
    },
  });
  await signIn(citizen.user);

  await page.goto("/app/account/notifications");
  await waitForAppShellHydration(page);

  await expect(browserCheckbox(page, "event_created")).toBeChecked();
  await browserCheckboxLabel(page, "event_created").click();
  await expect(browserCheckbox(page, "event_created")).not.toBeChecked();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(() =>
      prisma.notificationSetting.count({
        where: { citizenId: citizen.entity.id },
      }),
    )
    .toBe(0);
});

test("the on-site channel is always on and cannot be disabled", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "onsite-checker" });
  await signIn(citizen.user);

  await page.goto("/app/account/notifications");

  const onSiteCheckbox = page.locator('input[name="ONSITE_event_created"]');
  await expect(onSiteCheckbox).toBeChecked();
  await expect(onSiteCheckbox).toBeDisabled();
});
