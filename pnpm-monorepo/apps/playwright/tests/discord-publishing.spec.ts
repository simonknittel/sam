import { EventVisibility } from "@sam-monorepo/database/client";
import {
  MOCK_STAGE_CHANNEL,
  MOCK_TEXT_CHANNEL,
  MOCK_VOICE_CHANNEL,
} from "../fixtures/discord-mock";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEventTemplate,
  createRole,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** Discord's guild scheduled event entity types */
const VOICE_ENTITY_TYPE = 2;
const STAGE_ENTITY_TYPE = 1;
const EXTERNAL_ENTITY_TYPE = 3;

const futureEvent = () => ({
  startTime: new Date(Date.now() + ONE_DAY_MS),
  endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
});

test("the organizer publishes the event into a voice channel and unpublishes it again", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "discord-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Kanalfunk",
    description: "Wir treffen uns im Einsatzraum.",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);

  // Only voice and stage channels are offered — text channels cannot host an event
  await page.locator("label", { hasText: /^Sprachkanal$/ }).click();
  const channelSelect = page.getByLabel("Kanal", { exact: true });
  await expect(channelSelect).toBeVisible();
  await expect(
    channelSelect.getByRole("option", { name: MOCK_TEXT_CHANNEL.name }),
  ).toHaveCount(0);
  await channelSelect.selectOption({ label: MOCK_VOICE_CHANNEL.name });

  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  expect(published!.discordPublishedId).not.toBeNull();
  expect(published!.discordPublishedChannelId).toBe(MOCK_VOICE_CHANNEL.id);
  expect(published!.discordPublishedLocation).toBeNull();
  expect(published!.discordPublishedById).toBe(creator.entity.id);

  const scheduledEvent = discordMock.scheduledEvents.get(
    published!.discordPublishedId!,
  );
  expect(scheduledEvent).toMatchObject({
    name: "Operation Kanalfunk",
    description: "Wir treffen uns im Einsatzraum.",
    entity_type: VOICE_ENTITY_TYPE,
    channel_id: MOCK_VOICE_CHANNEL.id,
    privacy_level: 2,
  });
  expect(scheduledEvent).not.toHaveProperty("entity_metadata");

  // The published state replaces the form and links to the Discord event
  await expect(
    page.getByText(`Sprachkanal: ${MOCK_VOICE_CHANNEL.name}`),
  ).toBeVisible();
  // Exact: the description field's hint links to "Hilfe von Discord"
  await expect(
    page.getByRole("link", { name: "Discord", exact: true }).first(),
  ).toHaveAttribute(
    "href",
    new RegExp(`/events/.+/${published!.discordPublishedId}$`),
  );

  // The system log records the publication
  expect(
    await prisma.auditEvent.count({
      where: { type: "EVENT_PUBLISHED_TO_DISCORD" },
    }),
  ).toBe(1);

  await page.getByRole("button", { name: "Von Discord entfernen" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Entfernen" })
    .click();
  await expect(
    page.getByText("Das Event wurde von Discord entfernt."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  expect(discordMock.scheduledEvents.size).toBe(0);
  const unpublished = await prisma.event.findUnique({
    where: { id: event.id },
  });
  expect(unpublished!.discordPublishedId).toBeNull();
  expect(unpublished!.discordPublishedChannelId).toBeNull();
  expect(
    await prisma.auditEvent.count({
      where: { type: "EVENT_UNPUBLISHED_FROM_DISCORD" },
    }),
  ).toBe(1);
});

test("publishing to an external location defaults to the event's own URL", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "externer-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Aussenposten",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);

  // EXTERNAL is the default target, so the form can be submitted as it is
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  expect(published!.discordPublishedChannelId).toBeNull();
  /**
   * The origin comes from NEXT_PUBLIC_BASE_URL, which Next.js inlines at
   * build time — the worker's own random port is not part of it, so only
   * the path is asserted.
   */
  expect(published!.discordPublishedLocation).toMatch(
    new RegExp(`^https?://.+/app/events/${event.id}$`),
  );

  const scheduledEvent = discordMock.scheduledEvents.get(
    published!.discordPublishedId!,
  );
  expect(scheduledEvent).toMatchObject({
    entity_type: EXTERNAL_ENTITY_TYPE,
    entity_metadata: { location: published!.discordPublishedLocation },
  });
  // Discord rejects an external event without an end time
  expect(scheduledEvent!.scheduled_end_time).toBeTruthy();
});

test("a stage channel publishes as a stage event", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "buehnen-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Bühnenreif",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);

  await page.locator("label", { hasText: /^Sprachkanal$/ }).click();
  await page
    .getByLabel("Kanal", { exact: true })
    .selectOption({ label: MOCK_STAGE_CHANNEL.name });
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  expect(
    discordMock.scheduledEvents.get(published!.discordPublishedId!),
  ).toMatchObject({
    entity_type: STAGE_ENTITY_TYPE,
    channel_id: MOCK_STAGE_CHANNEL.id,
  });
});

test("editing a published event updates it on Discord, deleting it removes it", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "sync-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Erstfassung",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  const scheduledEventId = published!.discordPublishedId!;

  await page.reload();
  await waitForAppShellHydration(page);
  await page.getByLabel("Titel").fill("Operation Zweitfassung");
  await page.getByLabel("Beschreibung").fill("Jetzt mit Beschreibung.");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  expect(discordMock.scheduledEvents.get(scheduledEventId)).toMatchObject({
    name: "Operation Zweitfassung",
    description: "Jetzt mit Beschreibung.",
  });
  expect(
    discordMock.requests.some(
      (request) =>
        request.method === "PATCH" && request.path.endsWith(scheduledEventId),
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Event löschen" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();
  await expect(page).toHaveURL("/app/events", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  expect(discordMock.scheduledEvents.has(scheduledEventId)).toBe(false);
});

test("an event deleted on Discord's side is marked as unpublished again", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "drift-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Abdrift",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  discordMock.forgetScheduledEvent(published!.discordPublishedId!);

  await page.reload();
  await waitForAppShellHydration(page);
  await page.getByLabel("Titel").fill("Operation Abdrift II");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    page.getByText(
      "Das Event existiert auf Discord nicht mehr und gilt hier wieder als nicht veröffentlicht.",
    ),
  ).toBeVisible();

  const healed = await prisma.event.findUnique({ where: { id: event.id } });
  expect(healed!.discordPublishedId).toBeNull();
  expect(healed!.discordPublishedLocation).toBeNull();
  expect(
    await prisma.auditEvent.count({
      where: { type: "EVENT_DISCORD_PUBLICATION_CLEARED" },
    }),
  ).toBe(1);

  // The card offers publishing again
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Auf Discord veröffentlichen" }),
  ).toBeVisible();
});

test("a legacy description longer than Discord allows blocks publishing", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "langtext-orga",
    permissionStrings: ["event;read"],
  });
  // Written before the app-wide limit dropped to Discord's 1000 characters
  const event = await createAppEvent(prisma, {
    name: "Operation Wortreich",
    description: "a".repeat(1400),
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();

  await expect(
    page.getByText("Die Kurzbeschreibung ist länger als die 1000 Zeichen"),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  expect(discordMock.scheduledEvents.size).toBe(0);
  const stillUnpublished = await prisma.event.findUnique({
    where: { id: event.id },
  });
  expect(stillUnpublished!.discordPublishedId).toBeNull();
});

test("a cover image Discord cannot take is reported but does not stop publishing", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "titelbild-orga",
    permissionStrings: ["event;read"],
  });
  // Discord's image data only accepts JPEG, PNG and GIF
  const cover = await prisma.upload.create({
    data: {
      fileName: "cover.webp",
      mimeType: "image/webp",
      createdById: creator.user.id,
    },
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Bildfehler",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  await prisma.event.update({
    where: { id: event.id },
    data: { coverImageId: cover.id },
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();

  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByText("Das Titelbild konnte nicht an Discord übertragen werden."),
  ).toBeVisible();

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  expect(published!.discordPublishedId).not.toBeNull();
  // No image key at all, so Discord keeps whatever it has rather than clearing
  expect(
    discordMock.scheduledEvents.get(published!.discordPublishedId!),
  ).not.toHaveProperty("image");
});

test("publishing a restricted event needs an explicit confirmation", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const allowedRole = await createRole(prisma, { name: "eingeweihte" });
  const creator = await createCitizen(prisma, {
    handle: "geheim-discord-orga",
    permissionStrings: ["event;read"],
  });
  await assignRole(prisma, creator.entity, allowedRole);
  const event = await createAppEvent(prisma, {
    name: "Operation Stillschweigen",
    createdById: creator.entity.id,
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [allowedRole.id],
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();

  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByText("Auf Discord sehen es alle Mitglieder des Servers"),
  ).toBeVisible();

  // Cancelling publishes nothing
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  expect(discordMock.scheduledEvents.size).toBe(0);

  await page
    .getByRole("button", { name: "Auf Discord veröffentlichen" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Trotzdem veröffentlichen" })
    .click();
  await expect(
    page.getByText("Das Event wurde auf Discord veröffentlicht."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  expect(discordMock.scheduledEvents.size).toBe(1);
});

test("a template's publish preference prefills the create form and publishes the new event", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "vorlagen-orga",
    permissionStrings: ["event;read", "event;create"],
  });
  await createEventTemplate(prisma, {
    name: "Standard-Patrouille",
    ownedById: creator.entity.id,
    discordPublishTarget: "CHANNEL",
    discordPublishChannelId: MOCK_VOICE_CHANNEL.id,
  });

  await signIn(creator.user);
  await page.goto("/app/events");
  await page.getByRole("button", { name: "Event erstellen" }).click();
  await expect(
    page.getByRole("heading", { name: "Neues Event" }),
  ).toBeVisible();

  await page
    .getByLabel("Vorlage")
    .selectOption({ label: "Standard-Patrouille" });

  // The template switched publishing on and preselected its channel
  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_VOICE_CHANNEL.id,
  );

  await page.getByLabel("Titel").fill("Patrouille Alpha");
  await page.getByLabel("Start").fill("2027-05-05T20:00");
  await page.getByLabel("Ende").fill("2027-05-05T22:00");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const created = await prisma.event.findFirst({
    where: { name: "Patrouille Alpha" },
  });
  expect(created!.discordPublishedChannelId).toBe(MOCK_VOICE_CHANNEL.id);
  expect(
    discordMock.scheduledEvents.get(created!.discordPublishedId!),
  ).toMatchObject({
    name: "Patrouille Alpha",
    entity_type: VOICE_ENTITY_TYPE,
    channel_id: MOCK_VOICE_CHANNEL.id,
  });
});

/**
 * The create form widens the audience the same way the settings card does,
 * so it asks the same question. That the confirmation's own button submits
 * is covered by the settings-card test above — they share the dialog.
 */
test("creating a restricted event with publishing needs the same confirmation", async ({
  page,
  prisma,
  signIn,
  discordMock,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "geheim-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });

  await signIn(creator.user);
  await page.goto("/app/events");
  await page.getByRole("button", { name: "Event erstellen" }).click();
  await expect(
    page.getByRole("heading", { name: "Neues Event" }),
  ).toBeVisible();

  await page.getByLabel("Titel").fill("Operation Doppelt Geheim");
  await page.getByLabel("Start").fill("2027-06-01T20:00");
  await page.getByLabel("Ende").fill("2027-06-01T22:00");

  // The checkbox itself is visually hidden; its label is what users click
  await page
    .locator("label", { hasText: /^Auf Discord veröffentlichen$/ })
    .click();
  await expect(page.getByRole("textbox", { name: "Ort" })).toBeVisible();

  // Publishing a public event still saves in one click
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.locator("label", { hasText: /^Eingeschränkt$/ }).click();
  await page.getByRole("button", { name: "Speichern" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByText("Auf Discord sehen es alle Mitglieder des Servers"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  expect(await prisma.event.count()).toBe(0);
  expect(discordMock.scheduledEvents.size).toBe(0);

  // Back to public: the plain submit button is back and creates the event
  await page.locator("label", { hasText: /^Öffentlich$/ }).click();
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  expect(discordMock.scheduledEvents.size).toBe(1);
});

test("a Discord-sourced event offers no publishing at all", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "discord-event-manager",
    permissionStrings: ["event;read", "event;manage"],
  });
  const event = await prisma.event.create({
    data: {
      source: "DISCORD",
      discordId: "some-discord-event",
      discordCreatorId: "some-discord-organizer",
      name: "Operation Fremdimport",
      ...futureEvent(),
    },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/settings`);

  // Discord events have no settings tab at all
  await expect(page.getByText("Page not found")).toBeVisible();
});
