import {
  EventSource,
  VariantStatus,
  type PrismaClient,
} from "@sam-monorepo/database/client";
import {
  createCitizen,
  createEvent,
  createVariant,
  type Citizen,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Attendance is mirrored from Discord, so tests seed it directly. */
const addParticipant = (
  prisma: PrismaClient,
  eventId: string,
  citizen: Citizen,
) =>
  prisma.eventParticipant.create({
    data: {
      eventId,
      source: EventSource.DISCORD,
      citizenId: citizen.entity.id,
      discordUserId: citizen.entity.discordId!,
      activeCitizenId: citizen.entity.id,
      activeDiscordUserId: citizen.entity.discordId!,
    },
  });

test("the event list and detail subpages render", async ({
  page,
  prisma,
  signIn,
}) => {
  const organizer = await createCitizen(prisma, { handle: "organisator" });
  const firstParticipant = await createCitizen(prisma, {
    handle: "teilnehmer-eins",
  });
  const secondParticipant = await createCitizen(prisma, {
    handle: "teilnehmer-zwei",
  });
  const viewer = await createCitizen(prisma, {
    handle: "event-gast",
    permissionStrings: ["event;read"],
  });

  const event = await createEvent(prisma, {
    name: "Operation Morgenröte",
    discordCreatorId: organizer.entity.discordId!,
    startTime: new Date(Date.now() + ONE_DAY_MS),
    location: "Port Olisar",
  });
  await addParticipant(prisma, event.id, firstParticipant);
  await addParticipant(prisma, event.id, secondParticipant);

  await signIn(viewer.user);
  await page.goto("/app/events");

  await expect(
    page.getByRole("heading", { name: "Operation Morgenröte" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByTitle("Teilnehmer: 2")).toBeVisible();

  await page.getByRole("link", { name: "Details" }).click();
  await expect(page).toHaveURL(`/app/events/${event.id}`);
  await expect(page.getByText("Port Olisar")).toBeVisible();
  await expect(page.getByText("Start", { exact: true })).toBeVisible();

  // Without lineup and fleet permission only Übersicht and Teilnehmer exist
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Teilnehmer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Aufstellung" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Flotte" })).toHaveCount(0);

  await page.getByRole("link", { name: "Teilnehmer" }).click();
  await expect(page).toHaveURL(`/app/events/${event.id}/participants`);
  await expect(page.getByText("Teilnehmer (2)")).toBeVisible();
  await expect(page.getByText("teilnehmer-eins")).toBeVisible();
  await expect(page.getByText("teilnehmer-zwei")).toBeVisible();
  await expect(page.getByText("organisator", { exact: true })).toBeVisible();
});

test("the fleet tab counts the ships of both participation kinds", async ({
  page,
  prisma,
  signIn,
}) => {
  const organizer = await createCitizen(prisma, { handle: "organisator" });
  /**
   * The two ways a participation row identifies its citizen: an app sign-up
   * carries the citizen id, a Discord RSVP only the Discord id. The fleet
   * has to find the owner through either one.
   */
  const appSignUp = await createCitizen(prisma, { handle: "app-anmeldung" });
  const discordRsvp = await createCitizen(prisma, { handle: "discord-zusage" });
  const viewer = await createCitizen(prisma, {
    handle: "flotten-gast",
    permissionStrings: ["event;read", "orgFleet;read"],
  });

  const polaris = await createVariant(prisma, {
    manufacturerName: "Roberts Space Industries",
    seriesName: "Polaris",
    variantName: "Polaris",
    status: VariantStatus.FLIGHT_READY,
  });
  // Not flight ready, thus the fleet must leave it out
  const carrack = await createVariant(prisma, {
    manufacturerName: "Anvil Aerospace",
    seriesName: "Carrack",
    variantName: "Carrack",
    status: VariantStatus.NOT_FLIGHT_READY,
  });
  await prisma.ship.createMany({
    data: [
      { ownerId: appSignUp.entity.id, variantId: polaris.variant.id },
      { ownerId: discordRsvp.entity.id, variantId: polaris.variant.id },
      { ownerId: discordRsvp.entity.id, variantId: carrack.variant.id },
    ],
  });

  const event = await createEvent(prisma, {
    name: "Flottenübung",
    discordCreatorId: organizer.entity.discordId!,
    startTime: new Date(Date.now() + ONE_DAY_MS),
    location: "Port Olisar",
  });
  await prisma.eventParticipant.create({
    data: {
      eventId: event.id,
      source: EventSource.APP,
      citizenId: appSignUp.entity.id,
      activeCitizenId: appSignUp.entity.id,
    },
  });
  await prisma.eventParticipant.create({
    data: {
      eventId: event.id,
      source: EventSource.DISCORD,
      discordUserId: discordRsvp.entity.discordId!,
      activeDiscordUserId: discordRsvp.entity.discordId!,
    },
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}/fleet`);

  const polarisRow = page.getByRole("row").filter({ hasText: "Polaris" });
  await expect(polarisRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(polarisRow).toContainText("2");
  await expect(
    page.getByRole("row").filter({ hasText: "Carrack" }),
  ).toHaveCount(0);
});

test("a participant can toggle their interest in a position", async ({
  page,
  prisma,
  signIn,
}) => {
  /**
   * ship;read is required because the lineup page loads the viewer's fleet
   * (getMyFleet) for the requirement checks — without it the whole lineup
   * is forbidden. This is intended behavior.
   */
  const participant = await createCitizen(prisma, {
    handle: "posteninteressent",
    permissionStrings: ["event;read", "ship;read"],
  });
  const event = await createEvent(prisma, {
    name: "Operation Staubwolke",
    discordCreatorId: "unrelated-organizer",
    startTime: new Date(Date.now() + ONE_DAY_MS),
    lineupEnabled: true,
  });
  await addParticipant(prisma, event.id, participant);
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Bordschütze" },
  });

  await signIn(participant.user);
  await page.goto(`/app/events/${event.id}/lineup`);

  // The positions list renders client-side only — once the accordion toggle
  // is there, the page is interactive
  await expect(page.getByText("Bordschütze")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await clickUntilVisible(
    page.getByTitle("Details öffnen"),
    page.getByRole("button", { name: "Interesse anmelden" }),
  );

  await page.getByRole("button", { name: "Interesse anmelden" }).click();
  await expect(
    page.getByText(
      "Erfolgreich gespeichert. Die Anmeldung muss vom Organisator des Events bestätigt werden.",
    ),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(() =>
      prisma.eventPositionApplication.count({
        where: { positionId: position.id, citizenId: participant.entity.id },
      }),
    )
    .toBe(1);

  // The mirror action takes the application back
  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(
    page.getByRole("button", { name: "Interesse anmelden" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect
    .poll(() =>
      prisma.eventPositionApplication.count({
        where: { positionId: position.id },
      }),
    )
    .toBe(0);
});

test("the event manager sees applications and can assign the position", async ({
  page,
  prisma,
  signIn,
}) => {
  // ship;read: the lineup page loads the viewer's fleet, see above
  const manager = await createCitizen(prisma, {
    handle: "event-leiter",
    permissionStrings: ["event;read", "ship;read"],
  });
  const applicant = await createCitizen(prisma, { handle: "bewerber" });
  const event = await createEvent(prisma, {
    name: "Operation Eisensturm",
    discordCreatorId: manager.entity.discordId!,
    startTime: new Date(Date.now() + ONE_DAY_MS),
    lineupEnabled: true,
  });
  await addParticipant(prisma, event.id, applicant);
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Navigator" },
  });
  await prisma.eventPositionApplication.create({
    data: { positionId: position.id, citizenId: applicant.entity.id },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);

  await expect(page.getByText("Navigator")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const assignmentSelect = page.locator("select");
  await expect(assignmentSelect).toBeVisible();
  // The application shows up in the applicants optgroup
  await expect(
    assignmentSelect
      .locator('optgroup[label="Interessenten - Voraussetzungen erfüllt"]')
      .locator("option", { hasText: "bewerber" }),
  ).toHaveCount(1);

  await assignmentSelect.selectOption({ label: "bewerber" });
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const updatedPosition = await prisma.eventPosition.findUnique({
        where: { id: position.id },
      });
      return updatedPosition?.citizenId;
    })
    .toBe(applicant.entity.id);
});
