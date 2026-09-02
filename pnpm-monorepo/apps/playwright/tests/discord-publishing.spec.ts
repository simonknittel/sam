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
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  fillUntilValue,
  NOT_FOUND_TEXT,
  SAVED_TEXT,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The note the app appends to every description it hands to Discord, so that
 * a reader signs up in the app instead of pressing Discord's own button.
 */
const SIGN_UP_NOTE = "Anmeldung nur über SAM, nicht über Discord:";

/**
 * The description Discord receives: the text of the organizer, if there is
 * one, and the note below it. The origin comes from NEXT_PUBLIC_BASE_URL,
 * which Next.js inlines at build time, so only the path is asserted.
 */
const signUpNotePattern = (eventId: string, text?: string) =>
  new RegExp(
    `^${text ? `${text}\n\n` : ""}${SIGN_UP_NOTE}\nhttps?://[^/]+/app/events/${eventId}$`,
  );

/** Discord's guild scheduled event entity types */
const VOICE_ENTITY_TYPE = 2;
const STAGE_ENTITY_TYPE = 1;
const EXTERNAL_ENTITY_TYPE = 3;

/**
 * The two channel kinds Discord can host an event in. They differ only in
 * the entity type the app derives from the picked channel.
 */
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

    // Only voice and stage channels are offered — text channels cannot host an event
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
    ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

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
      // The sign-up note follows the description of the organizer
      description: expect.stringMatching(
        signUpNotePattern(event.id, "Wir treffen uns im Einsatzraum."),
      ),
      entity_type: entityType,
      channel_id: channel.id,
      privacy_level: 2,
    });
    expect(scheduledEvent).not.toHaveProperty("entity_metadata");

    // The published state replaces the form and links to the Discord event
    await expect(page.getByText(`Sprachkanal: ${channel.name}`)).toBeVisible();
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

  // An event without a description of its own carries the note alone
  expect(discordMock.scheduledEvents.get(scheduledEventId)).toMatchObject({
    description: expect.stringMatching(signUpNotePattern(event.id)),
  });

  await page.reload();
  await waitForAppShellHydration(page);
  await page.getByLabel("Titel").fill("Operation Zweitfassung");
  await page.getByLabel("Beschreibung").fill("Jetzt mit Beschreibung.");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
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
    page.getByText(
      /Die Kurzbeschreibung ist länger als die [\d.]+ Zeichen, die zusammen mit dem Hinweis zur Anmeldung auf Discord passen/,
    ),
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
  const cover = await createUpload(prisma, creator.user, {
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
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  await page
    .getByLabel("Vorlage")
    .selectOption({ label: "Standard-Patrouille" });

  // The template switched publishing on and preselected its channel
  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_VOICE_CHANNEL.id,
  );

  await fillUntilValue(page.getByLabel("Titel"), "Patrouille Alpha");
  await fillUntilValue(page.getByLabel("Start"), "2027-05-05T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-05-05T22:00");
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
 * The publish preference the test above reads is edited in the template's
 * Stammdaten form — the only place it is written by hand.
 */
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

  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(
      () =>
        prisma.eventTemplate.findUniqueOrThrow({ where: { id: template.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({
      discordPublishTarget: EventDiscordPublishTarget.CHANNEL,
      discordPublishChannelId: MOCK_STAGE_CHANNEL.id,
      discordPublishLocation: null,
    });

  /**
   * The form keeps showing what was just saved. React puts a form back to
   * its default values after the action, which used to leave the checkbox,
   * the target and the channel saying something else than the database.
   */
  await expect(
    page.getByLabel("Auf Discord veröffentlichen", { exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Ort" })).toBeHidden();
  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_STAGE_CHANNEL.id,
  );

  /** And brings it back on the next visit */
  await page.reload();
  await expect(page.getByLabel("Kanal", { exact: true })).toHaveValue(
    MOCK_STAGE_CHANNEL.id,
  );
});

/**
 * A template that already carries a preference brings it back into the form,
 * where it survives an unrelated edit, can be switched and can be cleared.
 */
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

  /** The preference comes back switched on, with its target preselected */
  await expect(page.getByRole("textbox", { name: "Ort" })).toBeVisible();

  /** An edit that does not touch publishing leaves the preference alone */
  await fillUntilValue(page.getByLabel("Name"), "Patrouille Bravo");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(readTemplate, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toMatchObject({
      name: "Patrouille Bravo",
      discordPublishTarget: EventDiscordPublishTarget.EXTERNAL,
    });

  /** Switching the target to a channel */
  await toggleLabel(page, /^Sprachkanal$/).click();
  await page
    .getByLabel("Kanal", { exact: true })
    .selectOption({ label: MOCK_VOICE_CHANNEL.name });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect
    .poll(readTemplate, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toMatchObject({
      discordPublishTarget: EventDiscordPublishTarget.CHANNEL,
      discordPublishChannelId: MOCK_VOICE_CHANNEL.id,
      discordPublishLocation: null,
    });

  /** Switching publishing off clears all three columns */
  await page.reload();
  await waitForAppShellHydration(page);
  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect
    .poll(readTemplate, { timeout: ACTION_FEEDBACK_TIMEOUT })
    .toMatchObject({
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
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(
      () =>
        prisma.eventTemplate.findUniqueOrThrow({
          where: { id: template.id },
          include: { visibilityRoles: { select: { roleId: true } } },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({
      discordPublishTarget: EventDiscordPublishTarget.EXTERNAL,
      visibilityRoles: [{ roleId: audienceRole.id }],
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
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  await fillUntilValue(page.getByLabel("Titel"), "Operation Doppelt Geheim");
  await fillUntilValue(page.getByLabel("Start"), "2027-06-01T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-06-01T22:00");

  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await expect(page.getByRole("textbox", { name: "Ort" })).toBeVisible();

  // Publishing a public event still saves in one click
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await toggleLabel(page, /^Eingeschränkt$/).click();
  await page.getByRole("button", { name: "Speichern" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByText("Auf Discord sehen es alle Mitglieder des Servers"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  expect(await prisma.event.count()).toBe(0);
  expect(discordMock.scheduledEvents.size).toBe(0);

  // Back to public: the plain submit button is back and creates the event
  await toggleLabel(page, /^Öffentlich$/).click();
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
  const event = await createEvent(prisma, {
    name: "Operation Fremdimport",
    discordCreatorId: "some-discord-organizer",
    startTime: futureEvent().startTime,
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/settings`);

  // Discord events have no settings tab at all
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  // The event around the missing tab stays navigable
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
});
