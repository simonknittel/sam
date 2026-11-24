import { EventDiscordPublishTarget } from "@sam-monorepo/database/client";
import {
  MOCK_STAGE_CHANNEL,
  MOCK_TEXT_CHANNEL,
  MOCK_VOICE_CHANNEL,
} from "../fixtures/discord-mock";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEvent,
  createEventTemplate,
  createRole,
  createUpload,
  EventVisibility,
  futureEvent,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilValue,
  NOT_FOUND_TEXT,
  openFormSection,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const SIGN_UP_NOTE = "Anmeldung nur über SAM, nicht über Discord:";

/**
 * Only the path is asserted, because the origin comes from NEXT_PUBLIC_BASE_URL
 * (see setup/stack.ts).
 */
const signUpNotePattern = (eventId: string, text?: string) =>
  new RegExp(
    `^${text ? `${text}\n\n` : ""}${SIGN_UP_NOTE}\nhttps?://[^/]+/app/events/${eventId}$`,
  );

const VOICE_ENTITY_TYPE = 2;
const STAGE_ENTITY_TYPE = 1;
const EXTERNAL_ENTITY_TYPE = 3;

const CHANNEL_KINDS = [
  { channel: MOCK_VOICE_CHANNEL, entityType: VOICE_ENTITY_TYPE },
  { channel: MOCK_STAGE_CHANNEL, entityType: STAGE_ENTITY_TYPE },
] as const;

for (const { channel, entityType } of CHANNEL_KINDS) {
  test(`the organizer publishes the event into a ${channel.name} channel and unpublishes it again`, async ({
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

    await toggleLabel(page, /^Sprachkanal$/).click();
    const channelSelect = page.getByLabel("Kanal", { exact: true });
    await expect(channelSelect).toBeVisible();
    await expect(
      channelSelect.getByRole("option", { name: MOCK_TEXT_CHANNEL.name }),
    ).toHaveCount(0);
    await channelSelect.selectOption({ label: channel.name });

    await page
      .getByRole("button", { name: "Auf Discord veröffentlichen" })
      .click();
    await expect(
      page.getByText("Das Event wurde auf Discord veröffentlicht."),
    ).toBeVisible();

    const published = await prisma.event.findUnique({
      where: { id: event.id },
    });
    expect(published!.discordPublishedId).not.toBeNull();
    expect(published!.discordPublishedChannelId).toBe(channel.id);
    expect(published!.discordPublishedLocation).toBeNull();
    expect(published!.discordPublishedById).toBe(creator.entity.id);

    const scheduledEvent = discordMock.scheduledEvents.get(
      published!.discordPublishedId!,
    );
    expect(scheduledEvent).toMatchObject({
      name: "Operation Kanalfunk",
      description: expect.stringMatching(
        signUpNotePattern(event.id, "Wir treffen uns im Einsatzraum."),
      ),
      entity_type: entityType,
      channel_id: channel.id,
      privacy_level: 2,
    });
    expect(scheduledEvent).not.toHaveProperty("entity_metadata");

    await expect(page.getByText(`Sprachkanal: ${channel.name}`)).toBeVisible();
    // Exact: the description field's hint links to "Formatierungen wie auf Discord"
    await expect(
      sectionByHeading(page, "Discord").getByRole("link", {
        name: "Discord",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      new RegExp(`/events/.+/${published!.discordPublishedId}$`),
    );

    await expect
      .poll(() =>
        prisma.auditEvent.count({
          where: { type: "EVENT_PUBLISHED_TO_DISCORD" },
        }),
      )
      .toBe(1);

    await page.getByRole("button", { name: "Von Discord entfernen" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Entfernen" })
      .click();
    await expect(
      page.getByText("Das Event wurde von Discord entfernt."),
    ).toBeVisible();

    expect(discordMock.scheduledEvents.size).toBe(0);
    const unpublished = await prisma.event.findUnique({
      where: { id: event.id },
    });
    expect(unpublished!.discordPublishedId).toBeNull();
    expect(unpublished!.discordPublishedChannelId).toBeNull();
    await expect
      .poll(() =>
        prisma.auditEvent.count({
          where: { type: "EVENT_UNPUBLISHED_FROM_DISCORD" },
        }),
      )
      .toBe(1);
  });
}

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
  ).toBeVisible();

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  expect(published!.discordPublishedChannelId).toBeNull();
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
  ).toBeVisible();

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  const scheduledEventId = published!.discordPublishedId!;

  expect(discordMock.scheduledEvents.get(scheduledEventId)).toMatchObject({
    description: expect.stringMatching(signUpNotePattern(event.id)),
  });

  await page.reload();
  await waitForAppShellHydration(page);
  await page.getByLabel("Titel").fill("Operation Zweitfassung");
  await page.getByLabel("Beschreibung").fill("Jetzt mit Beschreibung.");
  await sectionByHeading(page, "Stammdaten")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  expect(discordMock.scheduledEvents.get(scheduledEventId)).toMatchObject({
    name: "Operation Zweitfassung",
    description: expect.stringMatching(
      signUpNotePattern(event.id, "Jetzt mit Beschreibung."),
    ),
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
  await expect(page).toHaveURL("/app/events");

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
  ).toBeVisible();

  const published = await prisma.event.findUnique({ where: { id: event.id } });
  discordMock.forgetScheduledEvent(published!.discordPublishedId!);

  await page.reload();
  await waitForAppShellHydration(page);
  await page.getByLabel("Titel").fill("Operation Abdrift II");
  await sectionByHeading(page, "Stammdaten")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(
    page.getByText(
      "Das Event existiert auf Discord nicht mehr und gilt hier wieder als nicht veröffentlicht.",
    ),
  ).toBeVisible();

  const healed = await prisma.event.findUnique({ where: { id: event.id } });
  expect(healed!.discordPublishedId).toBeNull();
  expect(healed!.discordPublishedLocation).toBeNull();
  await expect
    .poll(() =>
      prisma.auditEvent.count({
        where: { type: "EVENT_DISCORD_PUBLICATION_CLEARED" },
      }),
    )
    .toBe(1);

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
  // Longer than the app-wide limit, which is below Discord's 1000 characters
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
    page.getByText(
      /Die Kurzbeschreibung ist länger als die [\d.]+ Zeichen, die zusammen mit dem Hinweis zur Anmeldung auf Discord passen/,
    ),
  ).toBeVisible();

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
  const cover = await createUpload(prisma, creator.entity, {
    fileName: "cover.webp",
    mimeType: "image/webp",
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
  ).toBeVisible();
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
  ).toBeVisible();

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
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  await page
    .getByLabel("Vorlage (optional)")
    .selectOption({ label: "Standard-Patrouille" });

  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_VOICE_CHANNEL.id,
  );

  await fillUntilValue(page.getByLabel("Titel"), "Patrouille Alpha");
  await fillUntilValue(page.getByLabel("Start"), "2027-05-05T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-05-05T22:00");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/);

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

test("the owner switches a template's publishing on and picks its channel", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "vorlagen-besitzer",
    permissionStrings: ["event;read", "event;create"],
  });
  const { template } = await createEventTemplate(prisma, {
    name: "Patrouille ohne Discord",
    ownedById: owner.entity.id,
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}`);
  await waitForAppShellHydration(page);

  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await toggleLabel(page, /^Sprachkanal$/).click();
  /** Not the first option, which a reset to the field's default would pick */
  await page
    .getByLabel("Kanal", { exact: true })
    .selectOption({ label: MOCK_STAGE_CHANNEL.name });

  await sectionByHeading(page, "Discord")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect
    .poll(() =>
      prisma.eventTemplate.findUniqueOrThrow({ where: { id: template.id } }),
    )
    .toMatchObject({
      discordPublishTarget: EventDiscordPublishTarget.CHANNEL,
      discordPublishChannelId: MOCK_STAGE_CHANNEL.id,
      discordPublishLocation: null,
    });

  /**
   * React puts a form back to its default values after the action, but the
   * checkbox, the target and the channel must agree with the database.
   */
  await expect(
    page.getByLabel("Auf Discord veröffentlichen", { exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Ort" })).toBeHidden();
  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_STAGE_CHANNEL.id,
  );

  await page.reload();
  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_STAGE_CHANNEL.id,
  );
});

test("a template's saved publish preference is edited, switched and cleared", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "vorlagen-pflegerin",
    permissionStrings: ["event;read", "event;create"],
  });
  const { template } = await createEventTemplate(prisma, {
    name: "Patrouille mit Discord",
    ownedById: owner.entity.id,
    discordPublishTarget: EventDiscordPublishTarget.EXTERNAL,
  });
  const readTemplate = () =>
    prisma.eventTemplate.findUniqueOrThrow({ where: { id: template.id } });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}`);
  await waitForAppShellHydration(page);

  await expect(page.getByRole("textbox", { name: "Ort" })).toBeVisible();

  await fillUntilValue(page.getByLabel("Name"), "Patrouille Bravo");
  await sectionByHeading(page, "Stammdaten")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect.poll(readTemplate).toMatchObject({
    name: "Patrouille Bravo",
    discordPublishTarget: EventDiscordPublishTarget.EXTERNAL,
  });

  await toggleLabel(page, /^Sprachkanal$/).click();
  await page
    .getByLabel("Kanal", { exact: true })
    .selectOption({ label: MOCK_VOICE_CHANNEL.name });
  await sectionByHeading(page, "Discord")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect.poll(readTemplate).toMatchObject({
    discordPublishTarget: EventDiscordPublishTarget.CHANNEL,
    discordPublishChannelId: MOCK_VOICE_CHANNEL.id,
    discordPublishLocation: null,
  });

  await page.reload();
  await waitForAppShellHydration(page);
  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await sectionByHeading(page, "Discord")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect.poll(readTemplate).toMatchObject({
    discordPublishTarget: null,
    discordPublishChannelId: null,
    discordPublishLocation: null,
  });
});

/**
 * A restricted template carries visibility roles the editor may not be
 * allowed to read. Switching publishing on must not make the save depend on
 * them.
 */
test("a restricted template keeps its roles while publishing is switched on", async ({
  page,
  prisma,
  signIn,
}) => {
  const audienceRole = await createRole(prisma, { name: "Sicherheitsdienst" });
  /** Deliberately without `otherRole;read`: the picker cannot name the role */
  const owner = await createCitizen(prisma, {
    handle: "restriktive-besitzerin",
    permissionStrings: ["event;read", "event;create"],
  });
  const { template } = await createEventTemplate(prisma, {
    name: "Vertrauliche Patrouille",
    ownedById: owner.entity.id,
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [audienceRole.id],
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}`);
  await waitForAppShellHydration(page);

  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await sectionByHeading(page, "Discord")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect
    .poll(() =>
      prisma.eventTemplate.findUniqueOrThrow({
        where: { id: template.id },
        include: { visibilityRoles: { select: { roleId: true } } },
      }),
    )
    .toMatchObject({
      discordPublishTarget: EventDiscordPublishTarget.EXTERNAL,
      visibilityRoles: [{ roleId: audienceRole.id }],
    });
});

/**
 * That the confirmation's own button submits is covered by the settings-card
 * test above: they share the dialog.
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
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  await fillUntilValue(page.getByLabel("Titel"), "Operation Doppelt Geheim");
  await fillUntilValue(page.getByLabel("Start"), "2027-06-01T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-06-01T22:00");

  await openFormSection(page, "Discord");
  await expect(
    page.getByLabel("Auf Discord veröffentlichen", { exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Ort" })).toBeVisible();

  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await openFormSection(page, "Sichtbarkeit");
  await toggleLabel(page, /^Eingeschränkt$/).click();
  await page.getByRole("button", { name: "Speichern" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByText("Auf Discord sehen es alle Mitglieder des Servers"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  expect(await prisma.event.count()).toBe(0);
  expect(discordMock.scheduledEvents.size).toBe(0);

  await toggleLabel(page, /^Öffentlich$/).click();
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/);
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
  const event = await createEvent(prisma, {
    name: "Operation Fremdimport",
    discordCreatorId: "some-discord-organizer",
    startTime: futureEvent().startTime,
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/settings`);

  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
});
