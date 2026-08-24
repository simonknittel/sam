import { VariantStatus } from "@sam-monorepo/database/client";
import {
  createCitizen,
  createEvent,
  createParticipant,
  createVariant,
  EventSource,
  LINEUP_PERMISSIONS,
  ONE_DAY_MS,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  SAVED_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

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
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: appSignUp,
    source: EventSource.APP,
  });
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: discordRsvp,
    citizenResolved: false,
  });

  await signIn(viewer.user);
  await page.goto(`/app/events/${event.id}/fleet`);

  const polarisRow = page.getByRole("row").filter({ hasText: "Polaris" });
  await expect(polarisRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    polarisRow.getByRole("cell", { name: "2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Carrack" }),
  ).toHaveCount(0);
});

test("a position application travels from the participant to the manager's assignment", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "event-leiter",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const applicant = await createCitizen(prisma, {
    handle: "bewerber",
    permissionStrings: LINEUP_PERMISSIONS,
  });
  const event = await createEvent(prisma, {
    name: "Operation Eisensturm",
    discordCreatorId: manager.entity.discordId!,
    startTime: new Date(Date.now() + ONE_DAY_MS),
    lineupEnabled: true,
  });
  await createParticipant(prisma, { eventId: event.id, citizen: applicant });
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Navigator" },
  });

  await signIn(applicant.user);
  await page.goto(`/app/events/${event.id}/lineup`);

  // The positions list renders client-side only — once the accordion toggle
  // is there, the page is interactive
  await expect(page.getByText("Navigator")).toBeVisible({
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
        where: { positionId: position.id, citizenId: applicant.entity.id },
      }),
    )
    .toBe(1);

  // The mirror action takes the application back …
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

  // … so the manager only gets to see it once it is back
  await page.getByRole("button", { name: "Interesse anmelden" }).click();
  await expect
    .poll(() =>
      prisma.eventPositionApplication.count({
        where: { positionId: position.id },
      }),
    )
    .toBe(1);

  await switchUser(manager.user);
  await page.goto(`/app/events/${event.id}/lineup`);

  await expect(page.getByText("Navigator")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  const assignmentSelect = page.getByRole("combobox", {
    name: "Citizen für Navigator",
  });
  await expect(assignmentSelect).toBeVisible();
  // The application shows up in the applicants optgroup
  await expect(
    assignmentSelect
      .locator('optgroup[label="Interessenten - Voraussetzungen erfüllt"]')
      .locator("option", { hasText: "bewerber" }),
  ).toHaveCount(1);

  await assignmentSelect.selectOption({ label: "bewerber" });
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
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
