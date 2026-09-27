import type { Page } from "@playwright/test";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, createUserWithoutCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The value of one row of the Übersicht tile. Each row names the attribute
 * on the left and holds its value on the right.
 */
const overviewAttribute = (page: Page, name: string) =>
  sectionByHeading(page, "Übersicht")
    .locator("dl > div")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator("dd");

test("a citizen is created from a Spectrum ID and deleted again", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-anleger",
    permissionStrings: ["citizen;create", "citizen;read", "citizen;delete"],
  });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  const createDialog = modal(page, "Neuer Citizen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Citizen" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("NEWCOMER");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  await expect(page).toHaveURL(/\/app\/spynet\/citizen\/[a-z0-9]+$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const created = await prisma.citizen.findFirstOrThrow({
    where: { spectrumId: "NEWCOMER" },
  });
  expect(created.createdById).toBe(admin.user.id);
  /** The Spectrum ID is recorded as the citizen's first log entry */
  const spectrumIdLog = await prisma.citizenLog.findFirstOrThrow({
    where: { citizenId: created.id, type: "spectrum-id" },
  });
  expect(spectrumIdLog.content).toBe("NEWCOMER");

  await expect(page.getByText("NEWCOMER").first()).toBeVisible();

  /**
   * Delete — everything hanging off the citizen goes with them
   */
  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await expect(page.getByText("Citizen löschen?")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(() => prisma.citizen.count({ where: { id: created.id } }))
    .toBe(0);
  expect(
    await prisma.citizenLog.count({ where: { citizenId: created.id } }),
  ).toBe(0);

  await expectAuditEvents(prisma, ["CITIZEN_CREATED", "CITIZEN_DELETED"]);
});

test("deleting a citizen keeps what they recorded about others", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-admin",
    permissionStrings: ["citizen;read", "citizen;delete"],
  });
  const recorder = await createCitizen(prisma, { handle: "chronist" });
  const member = await createCitizen(prisma, { handle: "mitglied" });

  const organization = await prisma.organization.create({
    data: {
      name: "Recorded Org",
      spectrumId: "RECORDEDORG",
      createdById: recorder.entity.id,
      activeMemberships: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
        },
      },
      membershipHistoryEntries: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
          createdById: recorder.entity.id,
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: recorder.entity.id,
        },
      },
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${recorder.entity.id}`);

  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(() => prisma.citizen.count({ where: { id: recorder.entity.id } }))
    .toBe(0);
  expect(
    await prisma.organization.findUnique({ where: { id: organization.id } }),
  ).toMatchObject({ createdById: null });
  expect(
    await prisma.activeOrganizationMembership.count({
      where: { citizenId: member.entity.id },
    }),
  ).toBe(1);
  expect(
    await prisma.organizationMembershipHistoryEntry.findFirst({
      where: { citizenId: member.entity.id },
    }),
  ).toMatchObject({ createdById: null, confirmedById: null });
});

test("a log entry is confirmed, and a second one marked a false report", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: [
      "citizen;read",
      "handle;create",
      "handle;read",
      "handle;confirm",
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );

  /**
   * Two entries, both unconfirmed until somebody decides about them
   */
  for (const content of ["ersterhandle", "zweiterhandle"]) {
    await historyDialog.getByPlaceholder("Neuer Eintrag ...").fill(content);
    await historyDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(historyDialog.getByText(content, { exact: true })).toBeVisible(
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    );
  }

  const entryOf = (content: string) =>
    historyDialog.getByRole("listitem").filter({ hasText: content });

  await expect(entryOf("zweiterhandle").getByText("Unbestätigt")).toBeVisible();

  await entryOf("zweiterhandle")
    .getByRole("button", { name: "Bestätigen" })
    .click();
  await expect(entryOf("zweiterhandle").getByText("Unbestätigt")).toHaveCount(
    0,
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );

  /** Deciding removes the entry's own decision buttons */
  await entryOf("ersterhandle")
    .getByRole("button", { name: "Falschmeldung" })
    .click();
  await expect(
    entryOf("ersterhandle").getByRole("button", { name: "Falschmeldung" }),
  ).toHaveCount(0, { timeout: ACTION_FEEDBACK_TIMEOUT });

  await expect
    .poll(
      async () => {
        const attributes = await prisma.citizenLogAttribute.findMany({
          where: {
            key: "confirmed",
            citizenLog: { citizenId: target.entity.id },
          },
          select: { value: true, citizenLog: { select: { content: true } } },
        });
        return Object.fromEntries(
          attributes.map((attribute) => [
            attribute.citizenLog.content,
            attribute.value,
          ]),
        );
      },
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toEqual({ ersterhandle: "false-report", zweiterhandle: "confirmed" });

  /** Only the confirmed one becomes the citizen's handle */
  await expect
    .poll(async () => {
      const entity = await prisma.citizen.findUniqueOrThrow({
        where: { id: target.entity.id },
        select: { handle: true },
      });
      return entity.handle;
    })
    .toBe("zweiterhandle");
});

test("confirming a Discord ID links the citizen to the login with that ID", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  const newcomer = await createUserWithoutCitizen(prisma, { name: "neuling" });
  const { providerAccountId } = await prisma.account.findFirstOrThrow({
    where: { userId: newcomer.id },
  });
  const target = await prisma.citizen.create({ data: { handle: "neuling" } });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  await historyDialog
    .getByPlaceholder("Neuer Eintrag ...")
    .fill(providerAccountId);
  await historyDialog.getByRole("button", { name: "Speichern" }).click();

  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: providerAccountId });
  await entry.getByRole("button", { name: "Bestätigen" }).click();

  await expect
    .poll(
      async () =>
        (
          await prisma.citizen.findUniqueOrThrow({
            where: { id: target.id },
            select: { userId: true },
          })
        ).userId,
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBe(newcomer.id);
});

test("the overview shows the confirmed value of every identity attribute", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: ["citizen;read", "discord-id;read", "teamspeak-id;read"],
  });
  /**
   * The columns hold what the confirmation of a log entry wrote into them
   * (see the test above), which is what the overview reads.
   */
  const target = await createCitizen(prisma, { handle: "beobachteter" });
  await prisma.citizen.update({
    where: { id: target.entity.id },
    data: {
      spectrumId: "BEOBACHTETER",
      citizenRecord: "9876543",
      communityMoniker: "Der Beobachtete",
      teamspeakId: "ts-4711",
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const expectedAttributes: Record<string, string> = {
    "Internal ID": target.entity.id,
    "Spectrum ID": "BEOBACHTETER",
    "Citizen ID": "9876543",
    Handle: "beobachteter",
    "Community Moniker": "Der Beobachtete",
    "Discord ID": target.entity.discordId!,
    "TeamSpeak ID": "ts-4711",
  };

  for (const [name, value] of Object.entries(expectedAttributes)) {
    await expect(overviewAttribute(page, name)).toContainText(value);
  }
});
