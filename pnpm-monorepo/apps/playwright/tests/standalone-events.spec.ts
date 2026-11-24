import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEvent,
  createParticipant,
  createRole,
  createVariant,
  EventSource,
  EventVisibility,
  futureEvent,
  ONE_DAY_MS,
  ONE_HOUR_MS,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  collectHydrationErrors,
  fillUntilValue,
  NOT_FOUND_TEXT,
  openFormSection,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("an authorized user creates a public event via the modal", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "event-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });

  await signIn(creator.user);
  await page.goto("/app/events");

  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  /**
   * The dialog mounts its lazily loaded template picker while these are
   * filled, and a fill landing in that re-render is dropped.
   */
  await fillUntilValue(page.getByLabel("Titel"), "Operation Nachtwache");
  await fillUntilValue(
    page.getByLabel("Beschreibung"),
    "Wir treffen uns am Sammelpunkt.",
  );
  // Wall time is interpreted as Europe/Berlin (2027-03-05 is CET, UTC+1)
  await fillUntilValue(page.getByLabel("Start"), "2027-03-05T20:00");
  await fillUntilValue(page.getByLabel("Ende"), "2027-03-05T22:00");
  // A new event goes to Discord by default; this one stays in the app
  await openFormSection(page, "Discord");
  await toggleLabel(page, /^Auf Discord veröffentlichen$/).click();
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/);
  await expect(
    page.getByRole("heading", { name: "Operation Nachtwache" }).first(),
  ).toBeVisible();

  const event = await prisma.event.findFirst({
    where: { name: "Operation Nachtwache" },
    include: { wikiPages: true },
  });
  expect(event).not.toBeNull();
  expect(event!.source).toBe(EventSource.APP);
  expect(event!.createdById).toBe(creator.entity.id);
  expect(event!.startTime.toISOString()).toBe("2027-03-05T19:00:00.000Z");
  expect(event!.endTime!.toISOString()).toBe("2027-03-05T21:00:00.000Z");
  expect(event!.wikiPages).toHaveLength(1);
  expect(event!.wikiPages[0]!.title).toBe("BRIEFING");

  await expect(page).toHaveURL(`/app/events/${event!.id}`);
  await expect(page.getByText("20:00").first()).toBeVisible();
  await expect(page.getByText("Wir treffen uns am Sammelpunkt.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Discord" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Briefing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Einstellungen" })).toBeVisible();
});

test("the description field previews the text and the sign-up note", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "vorschau-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });

  await signIn(creator.user);
  await page.goto("/app/events");

  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    page.getByRole("heading", { name: "Neues Event" }),
  );

  const description = "**Sammelpunkt** um 20 Uhr";
  await fillUntilValue(page.getByLabel("Beschreibung"), description);

  await openFormSection(page, "Discord");
  const preview = page.getByRole("region", { name: "Vorschau" });
  await expect(preview.getByText("Sammelpunkt")).toHaveJSProperty(
    "tagName",
    "STRONG",
  );
  await expect(preview).toContainText("um 20 Uhr");

  await expect(preview).toContainText(
    "Anmeldung nur über SAM, nicht über Discord:",
  );
  await expect(preview).toContainText("/app/events/…");

  await expect(
    page.getByText(new RegExp(`^${description.length} / [\\d.]+$`)),
  ).toBeVisible();
});

test("a user without event;create sees no create button and cannot open foreign settings", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "fremder-ersteller" });
  const viewer = await createCitizen(prisma, {
    handle: "nur-leser",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Fremdes Event",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(viewer.user);
  await page.goto("/app/events");
  await expect(
    page.getByRole("heading", { name: "Operation Fremdes Event" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Event erstellen" }),
  ).toHaveCount(0);

  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByRole("link", { name: "Einstellungen" })).toHaveCount(
    0,
  );

  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Teilnehmer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Aufstellung" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Flotte" })).toHaveCount(0);

  await page.goto(`/app/events/${event.id}/settings`);
  await expect(page.getByRole("heading", { name: "Redacted" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stammdaten" })).toHaveCount(
    0,
  );

  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
});

test("a dead briefing link keeps the event chrome, an unknown event does not", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "briefing-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Totes Briefing",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/briefing/gibt-es-nicht`);

  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Seiten durchsuchen" }),
  ).toBeVisible();

  await page.goto("/app/events/gibt-es-nicht");

  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(page.getByRole("link", { name: "Übersicht" })).toHaveCount(0);
});

test("the organizer edits the event via the settings tab", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "einstellungs-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Alter Name",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);

  await page.getByLabel("Titel").fill("Operation Neuer Name");
  await page.getByLabel("Beschreibung").fill("Jetzt mit Beschreibung.");
  await expect(
    sectionByHeading(page, "Discord").getByRole("region", { name: "Vorschau" }),
  ).toContainText("Jetzt mit Beschreibung.");
  await page.getByLabel("Start").fill("2027-07-10T18:30");
  await page.getByLabel("Ende").fill("2027-07-10T21:30");
  await sectionByHeading(page, "Stammdaten")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("heading", { name: "Operation Neuer Name" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Jetzt mit Beschreibung.")).toBeVisible();
  // 2027-07-10 is CEST — the Berlin wall time renders unchanged
  await expect(page.getByText("18:30").first()).toBeVisible();

  const activityTypes = await prisma.eventActivity.findMany({
    where: { eventId: event.id },
    select: { type: true },
  });
  expect(activityTypes.map((activity) => activity.type).toSorted()).toEqual([
    "DESCRIPTION_UPDATED",
    "SCHEDULE_UPDATED",
    "TITLE_UPDATED",
  ]);

  await expect
    .poll(() =>
      prisma.auditEvent.count({ where: { type: "EVENT_UPDATED_IN_APP" } }),
    )
    .toBe(1);

  await page.goto(`/app/events/${event.id}/activity`);
  await expect(
    page.getByText("Titel von Operation Alter Name zu Operation"),
  ).toBeVisible();
  await expect(page.getByText("Beschreibung aktualisiert")).toBeVisible();
  await expect(page.getByText("Zeitraum geändert:")).toBeVisible();
});

test.describe("in a browser outside the time zones of the server and the organization", () => {
  /**
   * The server runs in UTC, and the organization is in Europe/Berlin. Only
   * the browser can name a third time zone.
   */
  test.use({ timezoneId: "America/Los_Angeles" });

  test("the settings show the start in the time zone of the browser without a hydration error", async ({
    page,
    prisma,
    signIn,
  }) => {
    const creator = await createCitizen(prisma, {
      handle: "zeitzonen-orga",
      permissionStrings: ["event;read"],
    });
    /** Winter time: 20:00 in Berlin is 11:00 in Los Angeles */
    const event = await createAppEvent(prisma, {
      name: "Operation Zeitzone",
      createdById: creator.entity.id,
      startTime: new Date("2099-01-15T19:00:00.000Z"),
      endTime: new Date("2099-01-15T21:00:00.000Z"),
    });
    const hydrationErrors = collectHydrationErrors(page);

    await signIn(creator.user);
    await page.goto(`/app/events/${event.id}/settings`);
    await waitForAppShellHydration(page);

    await expect(page.getByLabel("Start")).toHaveValue("2099-01-15T20:00");
    await expect(
      page.getByText(
        /^In deiner Zeitzone \(America\/Los_Angeles\): .*15\. Januar 2099.*11:00$/,
      ),
    ).toBeVisible();
    expect(hydrationErrors).toEqual([]);
  });
});

test("deleting an event hides it everywhere", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "lösch-orga",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Kurzlebig",
    createdById: creator.entity.id,
    ...futureEvent(),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);

  await clickUntilVisible(
    page.getByRole("button", { name: "Event löschen" }),
    page.getByRole("alertdialog"),
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();

  await expect(page).toHaveURL("/app/events");
  await expect(page.getByText("Keine Events gefunden")).toBeVisible();

  const deletedEvent = await prisma.event.findUnique({
    where: { id: event.id },
  });
  expect(deletedEvent!.deletedAt).not.toBeNull();
  expect(deletedEvent!.deletedById).toBe(creator.entity.id);

  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("saving an event that a different manager deleted shows the error and the missing event", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "späte-orga",
    permissionStrings: ["event;read"],
  });
  const otherManager = await createCitizen(prisma, {
    handle: "schnelle-orga",
    permissionStrings: ["event;read", "event;manage"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Verschwunden",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  /**
   * The refresh of the first visit and the refresh of the visit action after
   * the deletion (see the README) must not occur. Thus the event is read, and
   * the action of the visit ends before the deletion.
   */
  await prisma.readMarker.create({
    data: { citizenId: creator.entity.id, eventId: event.id },
  });
  const markAsReadResponse = page.waitForResponse(
    (response) => response.request().headers()["next-action"] !== undefined,
  );

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await markAsReadResponse;
  await waitForAppShellHydration(page);

  await prisma.event.update({
    where: { id: event.id },
    data: { deletedAt: new Date(), deletedById: otherManager.entity.id },
  });

  await page.getByLabel("Titel").fill("Operation Zu Spät");
  await sectionByHeading(page, "Stammdaten")
    .getByRole("button", { name: "Speichern" })
    .click();

  await expect(
    page.getByText("Event nicht gefunden", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  const unchangedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
  });
  expect(unchangedEvent.name).toBe("Operation Verschwunden");
});

test("a restricted event is invisible to non-eligible users", async ({
  page,
  prisma,
  signIn,
}) => {
  const allowedRole = await createRole(prisma, {
    name: "erlaubte-rolle",
    permissionStrings: [],
  });
  const creator = await createCitizen(prisma, {
    handle: "geheim-orga",
    permissionStrings: ["event;read"],
  });
  const eligibleViewer = await createCitizen(prisma, {
    handle: "eingeweihter",
    permissionStrings: ["event;read"],
  });
  await assignRole(prisma, eligibleViewer.entity, allowedRole);
  const outsider = await createCitizen(prisma, {
    handle: "aussenstehender",
    permissionStrings: ["event;read"],
  });

  const event = await createAppEvent(prisma, {
    name: "Operation Geheimsache",
    createdById: creator.entity.id,
    ...futureEvent(),
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [allowedRole.id],
  });

  await signIn(outsider.user);
  await page.goto("/app/events");
  await expect(
    page.getByText("Keine Events gefunden").filter({ visible: true }),
  ).toBeVisible();
  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  await signIn(eligibleViewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("heading", { name: "Operation Geheimsache" }).first(),
  ).toBeVisible();

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("heading", { name: "Operation Geheimsache" }).first(),
  ).toBeVisible();
});

test("the sign-up lifecycle: sign up with comment, edit, cancel, re-sign-up", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "anmelde-orga" });
  const participant = await createCitizen(prisma, {
    handle: "anmelder",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Anmeldung",
    createdById: creator.entity.id,
    ...futureEvent(),
    lineupEnabled: true,
  });

  await signIn(participant.user);
  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);

  const participationState = (text: string) =>
    page.getByText(text, { exact: true }).filter({ visible: true });

  await expect(participationState("Nicht angemeldet")).toBeVisible();
  await page.getByLabel("Kommentar").fill("Bringe Snacks mit");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible();
  await expect(participationState("Zugesagt")).toBeVisible();

  await page.goto(`/app/events/${event.id}/participants`);
  await expect(page.getByText("Teilnehmer (1)")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "anmelder", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Bringe Snacks mit")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "anmelde-orga", exact: true }),
  ).toBeVisible();

  // Edit the comment. The stored value is already in the SSR markup, so
  // asserting it proves nothing about hydration — React re-seeds the draft of
  // the controlled textarea after the fill, which leaves the typed text
  // prepended to the restored one. Only insisting on the value survives that.
  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);
  await expect(page.getByLabel("Kommentar")).toHaveValue("Bringe Snacks mit");
  await fillUntilValue(
    page.getByLabel("Kommentar"),
    "Bringe doch keine Snacks mit",
  );
  await page.getByRole("button", { name: "Kommentar speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  const position = await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Sanitäter",
      citizenId: participant.entity.id,
    },
  });

  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);
  await expect(page.getByText("Sanitäter")).toBeVisible();

  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abmelden" })
    .click();
  await expect(page.getByText("Du hast dich abgemeldet.")).toBeVisible();
  await expect(participationState("Abgemeldet")).toBeVisible();

  const clearedPosition = await prisma.eventPosition.findUnique({
    where: { id: position.id },
  });
  expect(clearedPosition!.citizenId).toBeNull();

  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible();

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id, citizenId: participant.entity.id },
    orderBy: { createdAt: "asc" },
  });
  expect(rows).toHaveLength(2);
  expect(rows[0]!.cancelledAt).not.toBeNull();
  expect(rows[0]!.comment).toBe("Bringe doch keine Snacks mit");
  expect(rows[1]!.cancelledAt).toBeNull();
  expect(rows[1]!.comment).toBeNull();

  await page.goto(`/app/events/${event.id}/activity`);
  await expect(
    page.getByText("Angemeldet", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Bringe Snacks mit", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Kommentar aktualisiert")).toBeVisible();
  await expect(page.getByText("Abgemeldet", { exact: true })).toBeVisible();

  const affectedCell = page
    .getByRole("row")
    .filter({ hasText: "Abgemeldet" })
    .getByRole("cell")
    .nth(1);
  await expect(affectedCell).toContainText("anmelder");
});

test("sign-up closes at the event's end and past events show synthetic activity", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "vergangenheits-orga",
  });
  const viewer = await createCitizen(prisma, {
    handle: "zuspätkommer",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Vergangenheit",
    createdById: creator.entity.id,
    startTime: new Date(Date.now() - 3 * ONE_HOUR_MS),
    endTime: new Date(Date.now() - ONE_HOUR_MS),
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByText("Die Anmeldung ist geschlossen.").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Anmelden", exact: true }),
  ).toHaveCount(0);

  await page.goto(`/app/events/${event.id}/activity`);
  await expect(page.getByText("Das Event hat begonnen")).toBeVisible();
  await expect(page.getByText("Das Event ist zu Ende")).toBeVisible();
});

test("Discord events have no activity tab and manage participation in Discord", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "discord-gast",
    permissionStrings: ["event;read"],
  });
  const event = await createEvent(prisma, {
    name: "Operation Discord-Klassiker",
    discordCreatorId: "some-discord-organizer",
    startTime: new Date(Date.now() + ONE_DAY_MS),
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByRole("heading", { name: "Operation Discord-Klassiker" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Aktivität" })).toHaveCount(0);
  await expect(
    page.getByText("Die Teilnahme wird über Discord verwaltet."),
  ).toBeVisible();

  await page.goto(`/app/events/${event.id}/activity`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("the type filter narrows the list to app or Discord events", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "filter-orga" });
  const viewer = await createCitizen(prisma, {
    handle: "filter-nutzer",
    permissionStrings: ["event;read"],
  });
  await createAppEvent(prisma, {
    name: "Operation App-Event",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  await createEvent(prisma, {
    name: "Operation Discord-Event",
    discordCreatorId: "some-discord-organizer",
    startTime: new Date(Date.now() + ONE_DAY_MS),
  });

  await signIn(viewer.user);
  await page.goto("/app/events");
  await expect(
    page.getByRole("heading", { name: "Operation App-Event" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Operation Discord-Event" }),
  ).toBeVisible();

  await toggleLabel(page, /^App$/).click();
  await expect(
    page.getByRole("heading", { name: "Operation Discord-Event" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Operation App-Event" }),
  ).toBeVisible();

  await toggleLabel(page, /^Discord$/).click();
  await expect(
    page.getByRole("heading", { name: "Operation App-Event" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Operation Discord-Event" }),
  ).toBeVisible();
});

test("the personal briefing on a Discord event shows RSVP state and assigned position", async ({
  page,
  prisma,
  signIn,
}) => {
  const participant = await createCitizen(prisma, {
    handle: "discord-teilnehmer",
    permissionStrings: ["event;read"],
  });
  const event = await createEvent(prisma, {
    name: "Operation Posten-Check",
    discordCreatorId: "some-discord-organizer",
    startTime: new Date(Date.now() + ONE_DAY_MS),
    lineupEnabled: true,
  });
  await createParticipant(prisma, { eventId: event.id, citizen: participant });
  const { variant } = await createVariant(prisma, {
    manufacturerName: "Aegis",
    seriesName: "Retaliator",
    variantName: "Retaliator Bomber",
  });
  await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Torpedoschütze",
      description: "Bedient die Torpedos im Bug.",
      citizenId: participant.entity.id,
      requiredVariants: {
        create: { variantId: variant.id, order: 0 },
      },
    },
  });

  await signIn(participant.user);
  await page.goto(`/app/events/${event.id}`);

  await expect(page.getByText("Meine Teilnahme")).toBeVisible();
  await expect(page.getByText("Zugesagt")).toBeVisible();
  await expect(
    page.getByText("Die Teilnahme wird über Discord verwaltet."),
  ).toBeVisible();
  await expect(page.getByText("Torpedoschütze")).toBeVisible();
  await expect(page.getByText("Bedient die Torpedos im Bug.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Retaliator Bomber" }),
  ).toBeVisible();
});

test("the description renders the formats of Discord and exports plain text", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "formatierungs-orga",
    permissionStrings: ["event;read", "event;create"],
  });

  const description = [
    "**Sammelpunkt** um 20 Uhr.",
    "",
    "- Erster Punkt",
    "- Zweiter Punkt",
    "",
    "| Schiff | Rolle |",
    "| --- | --- |",
    "| Carrack | Aufklaerung |",
  ].join("\n");

  await signIn(creator.user);
  await page.goto("/app/events");

  await page.getByRole("button", { name: "Event erstellen" }).click();
  await expect(
    page.getByRole("heading", { name: "Neues Event" }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Formatierungen wie auf Discord" }),
  ).toBeVisible();

  await page.getByLabel("Titel").fill("Operation Formatierung");
  await page.getByLabel("Beschreibung").fill(description);
  await page.getByLabel("Start").fill("2027-04-08T20:00");
  await page.getByLabel("Ende").fill("2027-04-08T22:00");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/);

  await expect(
    page.locator("strong", { hasText: "Sammelpunkt" }),
  ).toBeVisible();
  await expect(page.getByText("**Sammelpunkt**")).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: "Erster Punkt" }),
  ).toBeVisible();

  await expect(page.getByRole("cell", { name: "Carrack" })).toHaveCount(0);
  await expect(page.getByText("| Schiff | Rolle |")).toBeVisible();

  await page
    .getByRole("button", { name: "Zum eigenen Kalender hinzufügen" })
    .click();
  const icsHref = await page
    .getByRole("menuitem", { name: "ICS-Datei herunterladen" })
    .getAttribute("href");
  // RFC 5545 folds a long line; unfold it before the text assertions
  const icsFile = decodeURIComponent(
    icsHref!.replace("data:text/calendar;charset=utf-8,", ""),
  ).replaceAll(/\r\n[\t ]/g, "");
  expect(icsFile).toContain("Sammelpunkt um 20 Uhr.");
  expect(icsFile).not.toContain("**Sammelpunkt**");
  expect(icsFile).toContain("- Erster Punkt");
});

/**
 * Sync safety ("a sync cycle leaves app events untouched") is covered in
 * syncDiscordEvents.integration.test.ts of the application package — this
 * stack does not run the Lambda function that starts the sync.
 */

test("the events list preview manages participation without leaving the list", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "listen-orga" });
  const participant = await createCitizen(prisma, {
    handle: "listen-anmelder",
    permissionStrings: ["event;read"],
  });
  const appEvent = await createAppEvent(prisma, {
    name: "Operation Schnellanmeldung",
    createdById: creator.entity.id,
    ...futureEvent(),
  });
  await createEvent(prisma, {
    name: "Operation Discord-Only",
    discordCreatorId: "some-discord-organizer",
    startTime: new Date(Date.now() + ONE_DAY_MS),
  });

  await signIn(participant.user);
  await page.goto("/app/events");
  await waitForAppShellHydration(page);

  const appEventPreview = page
    .getByRole("article")
    .filter({ hasText: "Operation Schnellanmeldung" });
  const discordEventPreview = page
    .getByRole("article")
    .filter({ hasText: "Operation Discord-Only" });
  await expect(
    discordEventPreview.getByRole("button", { name: "Anmelden" }),
  ).toHaveCount(0);

  await clickUntilVisible(
    appEventPreview.getByRole("button", { name: "Anmelden" }),
    page.getByRole("heading", {
      name: "Teilnahme - Operation Schnellanmeldung",
    }),
  );

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Nicht angemeldet")).toBeVisible();
  await fillUntilValue(dialog.getByLabel("Kommentar"), "Bin dabei");
  await dialog.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible();

  await expect(dialog.getByText("Zugesagt")).toBeVisible();
  await expect(dialog.getByLabel("Kommentar")).toHaveValue("Bin dabei");

  await dialog.getByRole("button", { name: "Abmelden", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abmelden" })
    .click();
  await expect(page.getByText("Du hast dich abgemeldet.")).toBeVisible();
  await expect(dialog.getByText("Abgemeldet", { exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(
    appEventPreview.getByRole("button", { name: "Anmelden" }),
  ).toBeVisible();

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: appEvent.id, citizenId: participant.entity.id },
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]!.comment).toBe("Bin dabei");
  expect(rows[0]!.cancelledAt).not.toBeNull();
});
