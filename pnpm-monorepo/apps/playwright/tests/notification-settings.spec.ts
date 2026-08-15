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

test("browser notifications are enabled by default", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "notification-defaulter",
  });
  await signIn(citizen.user);

  await page.goto("/app/account/notifications");
  await waitForAppShellHydration(page);

  await expect(browserCheckbox(page, "event_created")).toBeChecked();
  await expect(browserCheckbox(page, "wiki_page_reported")).toBeChecked();

  const settingsCount = await prisma.notificationSetting.count({
    where: { citizenId: citizen.entity.id },
  });
  expect(settingsCount).toBe(0);
});

test("disabling a browser notification persists a disabled setting", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "notification-muter" });
  await signIn(citizen.user);

  await page.goto("/app/account/notifications");
  await waitForAppShellHydration(page);

  await expect(browserCheckbox(page, "event_created")).toBeChecked();
  await browserCheckboxLabel(page, "event_created").click();
  await expect(browserCheckbox(page, "event_created")).not.toBeChecked();
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

test("re-enabling a browser notification deletes the disabled setting", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "notification-tuner" });
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

  await expect(browserCheckbox(page, "event_created")).not.toBeChecked();
  await browserCheckboxLabel(page, "event_created").click();
  await expect(browserCheckbox(page, "event_created")).toBeChecked();
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

test("disabling web push entirely removes all subscriptions", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "push-unsubscriber" });
  await prisma.webPushSubscription.createMany({
    data: [
      {
        citizenId: citizen.entity.id,
        endpoint: "https://push.example.com/push-unsubscriber-device-1",
        p256dh: "test-p256dh-1",
        auth: "test-auth-1",
      },
      {
        citizenId: citizen.entity.id,
        endpoint: "https://push.example.com/push-unsubscriber-device-2",
        p256dh: "test-p256dh-2",
        auth: "test-auth-2",
      },
    ],
  });
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

  await page
    .getByRole("button", { name: "Auf allen Geräten deaktivieren" })
    .click();
  await expect(
    page.getByText(
      "Die Benachrichtigungen wurden auf allen Geräten deaktiviert.",
    ),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await expect
    .poll(() =>
      prisma.webPushSubscription.count({
        where: { citizenId: citizen.entity.id },
      }),
    )
    .toBe(0);

  // The per-type disabled setting survives so it is restored when the citizen
  // subscribes again.
  const settingsCount = await prisma.notificationSetting.count({
    where: { citizenId: citizen.entity.id },
  });
  expect(settingsCount).toBe(1);

  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "WEB_PUSH_UNSUBSCRIBED" },
  });
  expect(auditEvent).not.toBeNull();
});
