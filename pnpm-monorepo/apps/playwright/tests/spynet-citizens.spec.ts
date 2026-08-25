import type { Page } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen } from "../fixtures/factories";
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

  const created = await prisma.entity.findFirstOrThrow({
    where: { spectrumId: "NEWCOMER" },
  });
  expect(created.createdById).toBe(admin.user.id);
  /** The Spectrum ID is recorded as the citizen's first log entry */
  const spectrumIdLog = await prisma.entityLog.findFirstOrThrow({
    where: { entityId: created.id, type: "spectrum-id" },
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
    .poll(() => prisma.entity.count({ where: { id: created.id } }))
    .toBe(0);
  expect(
    await prisma.entityLog.count({ where: { entityId: created.id } }),
  ).toBe(0);

  await expectAuditEvents(prisma, ["CITIZEN_CREATED", "CITIZEN_DELETED"]);
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
        const attributes = await prisma.entityLogAttribute.findMany({
          where: {
            key: "confirmed",
            entityLog: { entityId: target.entity.id },
          },
          select: { value: true, entityLog: { select: { content: true } } },
        });
        return Object.fromEntries(
          attributes.map((attribute) => [
            attribute.entityLog.content,
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
      const entity = await prisma.entity.findUniqueOrThrow({
        where: { id: target.entity.id },
        select: { handle: true },
      });
      return entity.handle;
    })
    .toBe("zweiterhandle");
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
  await prisma.entity.update({
    where: { id: target.entity.id },
    data: {
      spectrumId: "BEOBACHTETER",
      citizenId: "9876543",
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
