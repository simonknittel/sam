import type { PrismaClient } from "@sam-monorepo/database/client";
import { EventSource, EventVisibility } from "@sam-monorepo/database/client";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEvent,
  createRole,
  createVariant,
  type Citizen,
} from "../fixtures/factories";
import { ACTION_FEEDBACK_TIMEOUT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

const addAppParticipant = (
  prisma: PrismaClient,
  eventId: string,
  citizen: Citizen,
  comment?: string,
) =>
  prisma.eventParticipant.create({
    data: {
      eventId,
      source: EventSource.APP,
      citizenId: citizen.entity.id,
      activeCitizenId: citizen.entity.id,
      comment,
    },
  });

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

  await page.getByRole("button", { name: "Event erstellen" }).click();
  await expect(
    page.getByRole("heading", { name: "Neues Event" }),
  ).toBeVisible();

  await page.getByLabel("Titel").fill("Operation Nachtwache");
  await page.getByLabel("Beschreibung").fill("Wir treffen uns am Sammelpunkt.");
  // Wall time is interpreted as Europe/Berlin (2027-03-05 is CET, UTC+1)
  await page.getByLabel("Start").fill("2027-03-05T20:00");
  await page.getByLabel("Ende").fill("2027-03-05T22:00");
  await page.getByRole("button", { name: "Speichern" }).click();

  // Creating redirects straight to the new event's overview
  await expect(page).toHaveURL(/\/app\/events\/[a-z0-9]+$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
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
  // The briefing root page is seeded like the Discord sync does
  expect(event!.wikiPages).toHaveLength(1);
  expect(event!.wikiPages[0]!.title).toBe("BRIEFING");

  await expect(page).toHaveURL(`/app/events/${event!.id}`);
  // Times render in Europe/Berlin
  await expect(page.getByText("20:00").first()).toBeVisible();
  await expect(page.getByText("Wir treffen uns am Sammelpunkt.")).toBeVisible();
  // No Discord affordances on app events
  await expect(page.getByRole("link", { name: "Discord" })).toHaveCount(0);
  // The creator gets the manager-scoped briefing tab and the settings tab
  await expect(page.getByRole("link", { name: "Briefing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Einstellungen" })).toBeVisible();
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
    startTime: new Date(Date.now() + ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
  });

  await signIn(viewer.user);
  await page.goto("/app/events");
  await expect(
    page.getByRole("heading", { name: "Operation Fremdes Event" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByRole("button", { name: "Event erstellen" }),
  ).toHaveCount(0);

  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByRole("link", { name: "Einstellungen" })).toHaveCount(
    0,
  );
  await page.goto(`/app/events/${event.id}/settings`);
  await expect(page.getByRole("heading", { name: "Redacted" })).toBeVisible();
  await expect(page.getByText("Event bearbeiten")).toHaveCount(0);
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
    startTime: new Date(Date.now() + ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);

  await page.getByLabel("Titel").fill("Operation Neuer Name");
  await page.getByLabel("Beschreibung").fill("Jetzt mit Beschreibung.");
  await page.getByLabel("Start").fill("2027-07-10T18:30");
  await page.getByLabel("Ende").fill("2027-07-10T21:30");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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

  const auditCount = await prisma.auditEvent.count({
    where: { type: "EVENT_UPDATED_IN_APP" },
  });
  expect(auditCount).toBe(1);

  // The feed renders the changes
  await page.goto(`/app/events/${event.id}/activity`);
  await expect(
    page.getByText("hat den Titel von Operation Alter Name zu Operation"),
  ).toBeVisible();
  await expect(
    page.getByText("hat die Beschreibung aktualisiert"),
  ).toBeVisible();
  await expect(page.getByText("hat den Zeitraum geändert:")).toBeVisible();
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
    startTime: new Date(Date.now() + ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
  });

  await signIn(creator.user);
  await page.goto(`/app/events/${event.id}/settings`);

  await page.getByRole("button", { name: "Event löschen" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();

  await expect(page).toHaveURL("/app/events", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Keine Events gefunden")).toBeVisible();

  const deletedEvent = await prisma.event.findUnique({
    where: { id: event.id },
  });
  expect(deletedEvent!.deletedAt).not.toBeNull();
  expect(deletedEvent!.deletedById).toBe(creator.entity.id);

  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByText("Page not found")).toBeVisible();
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
    startTime: new Date(Date.now() + ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
    visibility: EventVisibility.RESTRICTED,
    visibilityRoleIds: [allowedRole.id],
  });

  await signIn(outsider.user);
  await page.goto("/app/events");
  await expect(page.getByText("Keine Events gefunden")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByText("Page not found")).toBeVisible();

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
    startTime: new Date(Date.now() + ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
    lineupEnabled: true,
  });

  await signIn(participant.user);
  await page.goto(`/app/events/${event.id}`);

  await expect(page.getByText("Nicht angemeldet")).toBeVisible();
  await page.getByLabel("Kommentar").fill("Bringe Snacks mit");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Zugesagt")).toBeVisible();

  await page.goto(`/app/events/${event.id}/participants`);
  await expect(page.getByText("Teilnehmer (1)")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "anmelder", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Bringe Snacks mit")).toBeVisible();
  // Organizer resolves from createdBy
  await expect(
    page.getByRole("link", { name: "anmelde-orga", exact: true }),
  ).toBeVisible();

  // Edit the comment
  await page.goto(`/app/events/${event.id}`);
  await page.getByLabel("Kommentar").fill("Bringe doch keine Snacks mit");
  await page.getByRole("button", { name: "Kommentar speichern" }).click();
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // A manager assigns the participant to a position; cancelling must clear it
  const position = await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Sanitäter",
      citizenId: participant.entity.id,
    },
  });

  await page.goto(`/app/events/${event.id}`);
  await expect(page.getByText("Sanitäter")).toBeVisible();

  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abmelden" })
    .click();
  await expect(page.getByText("Du hast dich abgemeldet.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Abgemeldet", { exact: true })).toBeVisible();

  const clearedPosition = await prisma.eventPosition.findUnique({
    where: { id: position.id },
  });
  expect(clearedPosition!.citizenId).toBeNull();

  // Re-sign-up creates a fresh row; the cancelled row stays as history
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByText("Du bist angemeldet.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: event.id, citizenId: participant.entity.id },
    orderBy: { createdAt: "asc" },
  });
  expect(rows).toHaveLength(2);
  expect(rows[0]!.cancelledAt).not.toBeNull();
  expect(rows[0]!.comment).toBe("Bringe doch keine Snacks mit");
  expect(rows[1]!.cancelledAt).toBeNull();
  expect(rows[1]!.comment).toBeNull();

  // The activity feed recorded the whole lifecycle
  await page.goto(`/app/events/${event.id}/activity`);
  await expect(
    page.getByText("hat sich angemeldet", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Bringe Snacks mit", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("hat den Kommentar aktualisiert")).toBeVisible();
  await expect(page.getByText("hat sich abgemeldet")).toBeVisible();
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
  await expect(page.getByText("Die Anmeldung ist geschlossen.")).toBeVisible();
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
  await expect(page.getByText("Page not found")).toBeVisible();
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
    startTime: new Date(Date.now() + ONE_DAY_MS),
    endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
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
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByRole("heading", { name: "Operation Discord-Event" }),
  ).toBeVisible();

  await page.locator("label", { hasText: /^App$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Operation Discord-Event" }),
  ).toHaveCount(0, { timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByRole("heading", { name: "Operation App-Event" }),
  ).toBeVisible();

  await page.locator("label", { hasText: /^Discord$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Operation App-Event" }),
  ).toHaveCount(0, { timeout: ACTION_FEEDBACK_TIMEOUT });
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
  await prisma.eventParticipant.create({
    data: {
      eventId: event.id,
      source: EventSource.DISCORD,
      citizenId: participant.entity.id,
      discordUserId: participant.entity.discordId!,
      activeCitizenId: participant.entity.id,
      activeDiscordUserId: participant.entity.discordId!,
    },
  });
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
        create: { variantId: variant.id },
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

/**
 * Sync safety ("a sync cycle leaves app events untouched") is covered at
 * the unit level in the lambda's reconciliation tests — the sync itself
 * needs Discord credentials and cannot run against the local stack.
 */
