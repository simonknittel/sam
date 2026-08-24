import type { Page } from "@playwright/test";
import { NotificationChannel } from "@sam-monorepo/database/client";
import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  SAVED_TEXT,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The checkbox input itself is sr-only — the visible control is the box its
 * wrapping label draws, so toggling goes through the label the way a click
 * does. State is read off the input, located by its form field name
 * (ONSITE_<type> / WEB_PUSH_<type>) so the cases stay written in ids.
 */
const browserCheckbox = (page: Page, notificationType: string) =>
  page.locator(`input[name="WEB_PUSH_${notificationType}"]`);

const browserCheckboxLabel = (page: Page, notificationType: string) =>
  toggleLabel(page, browserCheckbox(page, notificationType));

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

  // Each box names its channel and its notification type; the visible
  // Ja/Nein text is the state, never the name
  await expect(
    page.getByRole("checkbox", { name: "Browser: Neues Event" }),
  ).toBeChecked();

  // The on-site channel is always on and cannot be turned off
  const onSiteCheckbox = page.getByRole("checkbox", {
    name: "On-site: Neues Event",
  });
  await expect(onSiteCheckbox).toBeChecked();
  await expect(onSiteCheckbox).toBeDisabled();

  const settingsCount = await prisma.notificationSetting.count({
    where: { citizenId: citizen.entity.id },
  });
  expect(settingsCount).toBe(0);
});

test("toggling a browser notification off and on again is a round trip", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "notification-muter" });
  await signIn(citizen.user);

  await page.goto("/app/account/notifications");
  await waitForAppShellHydration(page);

  // Disabling persists a "disabled" row …
  await expect(browserCheckbox(page, "event_created")).toBeChecked();
  await browserCheckboxLabel(page, "event_created").click();
  await expect(browserCheckbox(page, "event_created")).not.toBeChecked();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
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

  // … and re-enabling deletes it again, back to the default
  await browserCheckboxLabel(page, "event_created").click();
  await expect(browserCheckbox(page, "event_created")).toBeChecked();

  await expect
    .poll(() =>
      prisma.notificationSetting.count({
        where: { citizenId: citizen.entity.id },
      }),
    )
    .toBe(0);
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
