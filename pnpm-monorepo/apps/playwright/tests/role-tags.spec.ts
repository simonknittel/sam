import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import path from "node:path";
import { expectAuditEvents } from "../fixtures/audit";
import {
  assignRole,
  createCitizen,
  createRole,
  createRoleTag,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilVisible,
  FORBIDDEN_TEXT,
  modal,
  pickRoles,
  rolePickerChips,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const NAME_TAKEN_TEXT = "Ein Tag mit diesem Namen existiert bereits.";

/** 64x48 PNG */
const imagePath = path.join(
  __dirname,
  "..",
  "fixtures",
  "assets",
  "upload.png",
);

/**
 * The dimension probe runs after the assign response and needs S3 round
 * trips of its own (see uploads.spec.ts)
 */
const UPLOAD_TIMEOUT = 20_000;

/** The navigation link of the IAM page "Tags" */
const tagsNavigationLink = (page: Page) =>
  page
    .getByRole("link", { name: "Tags", exact: true })
    .filter({ visible: true });

/** The links between roles and tags as "role:tag", sorted */
const readLinks = async (prisma: PrismaClient) => {
  const assignments = await prisma.roleTagAssignment.findMany({
    select: {
      role: { select: { name: true } },
      tag: { select: { name: true } },
    },
  });

  return assignments
    .map(({ role, tag }) => `${role.name}:${tag.name}`)
    .toSorted();
};

test("a manager creates a tag, and a name that a tag has in a different case shows the error", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "tag-admin",
    permissionStrings: ["role;manage"],
  });

  await signIn(admin.user);
  await page.goto("/app/iam/tags");
  await expect(page.getByText("Keine Tags vorhanden")).toBeVisible();
  await expect(tagsNavigationLink(page)).toBeVisible();

  const createDialog = modal(page, "Neuer Tag");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neuer Tag" }),
    createDialog,
  );
  await createDialog.getByLabel("Name", { exact: true }).fill("Flug");
  await createDialog
    .getByLabel("Beschreibung", { exact: true })
    .fill("Alle Rollen der Flugstaffel");
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  // The action opens the page of the new tag
  const form = sectionByHeading(page, "Tag bearbeiten");
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("Flug");
  await expect(page).toHaveURL(/\/app\/iam\/tags\/[a-z0-9]+$/);
  expect(
    await prisma.roleTag.findMany({
      select: { name: true, description: true },
    }),
  ).toEqual([{ name: "Flug", description: "Alle Rollen der Flugstaffel" }]);
  await expectAuditEvents(prisma, ["ROLE_TAG_CREATED"]);

  await page.goto("/app/iam/tags");
  await expect(
    page.getByRole("link", { name: "Flug", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Alle Rollen der Flugstaffel")).toBeVisible();

  await clickUntilVisible(
    page.getByRole("button", { name: "Neuer Tag" }),
    createDialog,
  );
  const nameInput = createDialog.getByLabel("Name", { exact: true });
  await nameInput.fill("flug");
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  // The dialog stays open, thus it shows the error itself
  await expect(createDialog.getByRole("alert")).toHaveText(NAME_TAKEN_TEXT);
  await expect(nameInput).toHaveValue("flug");
  expect(await prisma.roleTag.count()).toBe(1);
});

test("a manager renames, describes and deletes a tag and changes its roles on the tag page", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "tag-admin",
    permissionStrings: ["role;manage"],
  });
  const pilot = await createRole(prisma, { name: "Pilot" });
  const scout = await createRole(prisma, { name: "Scout" });
  const tag = await createRoleTag(prisma, { name: "Kampf", roles: [scout] });
  await createRoleTag(prisma, { name: "Flug" });

  await signIn(admin.user);
  await page.goto(`/app/iam/tags/${tag.id}`);
  await waitForAppShellHydration(page);
  const form = sectionByHeading(page, "Tag bearbeiten");
  const nameInput = form.getByLabel("Name", { exact: true });
  const saveButton = form.getByRole("button", { name: "Speichern" });

  // The name of a different tag in a different case
  await nameInput.fill("FLUG");
  await saveButton.click();
  await expect(form.getByRole("alert")).toHaveText(NAME_TAKEN_TEXT);
  await expect(nameInput).toHaveValue("FLUG");
  expect(
    await prisma.roleTag.findUniqueOrThrow({ where: { id: tag.id } }),
  ).toMatchObject({ name: "Kampf", description: null });

  // The roles of the tag show as chips: one role more, one role less
  await expect(rolePickerChips(form)).toHaveText(["Scout"]);
  await pickRoles(form.getByRole("button", { name: "Rolle auswählen" }), [
    "Pilot",
  ]);
  await rolePickerChips(form).filter({ hasText: "Scout" }).click();
  await expect(rolePickerChips(form)).toHaveText(["Pilot"]);

  await nameInput.fill("Gefecht");
  await form
    .getByLabel("Beschreibung", { exact: true })
    .fill("Alle Rollen im Gefecht");
  await saveButton.click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(form.getByRole("alert")).toHaveCount(0);

  expect(
    await prisma.roleTag.findUniqueOrThrow({ where: { id: tag.id } }),
  ).toMatchObject({ name: "Gefecht", description: "Alle Rollen im Gefecht" });
  expect(await readLinks(prisma)).toEqual(["Pilot:Gefecht"]);
  await expectAuditEvents(prisma, [
    "ROLE_TAG_UPDATED",
    "ROLE_TAG_ASSIGNMENTS_UPDATED",
  ]);

  // The list: sorted by name, each tag with its roles
  await page.goto("/app/iam/tags");
  await expect(page.getByRole("link", { name: /^(Flug|Gefecht)$/ })).toHaveText(
    ["Flug", "Gefecht"],
  );
  const listItem = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: "Gefecht", exact: true }) });
  await expect(listItem.getByText("Alle Rollen im Gefecht")).toBeVisible();
  await expect(
    listItem.getByRole("list", { name: "Rollen" }).getByRole("link"),
  ).toHaveText(["Pilot"]);

  // The delete removes only the tag, and the roles stay
  await page.goto(`/app/iam/tags/${tag.id}`);
  await waitForAppShellHydration(page);
  const deleteDialog = page.getByRole("alertdialog", { name: "Tag löschen?" });
  await page.getByRole("button", { name: "Löschen" }).click();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(
    page.getByRole("link", { name: "Flug", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Gefecht", exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/app\/iam\/tags$/);
  expect(await prisma.roleTag.count({ where: { id: tag.id } })).toBe(0);
  expect(
    await prisma.role.count({ where: { id: { in: [pilot.id, scout.id] } } }),
  ).toBe(2);
  await expectAuditEvents(prisma, [
    "ROLE_TAG_UPDATED",
    "ROLE_TAG_ASSIGNMENTS_UPDATED",
    "ROLE_TAG_DELETED",
  ]);
});

test("the icon of a tag is uploaded on the tag page and shows in the tag list", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "tag-admin",
    permissionStrings: ["role;manage"],
  });
  const tag = await createRoleTag(prisma, { name: "Flug" });

  await signIn(admin.user);
  await page.goto(`/app/iam/tags/${tag.id}`);
  await waitForAppShellHydration(page);

  await page.locator('input[type="file"]').setInputFiles(imagePath);
  await expect(page.getByText("Erfolgreich hochgeladen")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await prisma.roleTag.findUniqueOrThrow({ where: { id: tag.id } }))
          .iconId,
      { timeout: UPLOAD_TIMEOUT },
    )
    .not.toBeNull();
  const { iconId } = await prisma.roleTag.findUniqueOrThrow({
    where: { id: tag.id },
  });
  await expectAuditEvents(prisma, ["RESOURCE_IMAGE_ASSIGNED"]);

  await page.goto("/app/iam/tags");
  const icon = page
    .getByRole("link", { name: "Flug", exact: true })
    .locator(`img[src*="${iconId}"]`);
  await expect(icon).toBeVisible();
  // The natural width stays 0 until the browser has loaded the image
  await expect(icon).not.toHaveJSProperty("naturalWidth", 0);
});

test("the role page saves the tags of the role", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "tag-admin",
    permissionStrings: ["role;manage"],
  });
  const pilot = await createRole(prisma, { name: "Pilot" });
  const scout = await createRole(prisma, { name: "Scout" });
  await createRoleTag(prisma, { name: "Flug", roles: [pilot] });
  await createRoleTag(prisma, { name: "Kampf", roles: [scout] });
  await createRoleTag(prisma, { name: "Logistik" });

  await signIn(admin.user);
  await page.goto(`/app/roles/${pilot.id}`);
  await waitForAppShellHydration(page);
  const tile = sectionByHeading(page, "Tags");
  const chips = tile.getByTitle("Tag entfernen");
  await expect(chips).toHaveText(["Flug"]);

  // The search finds the tag, and a click selects it
  const popover = page.getByRole("dialog", { name: "Tag auswählen" });
  await clickUntilVisible(
    tile.getByRole("button", { name: "Tag auswählen" }),
    popover,
  );
  await expect(popover.getByRole("option")).toHaveText([
    "Flug",
    "Kampf",
    "Logistik",
  ]);
  await popover.getByRole("combobox", { name: "Tag suchen …" }).fill("kam");
  const option = popover.getByRole("option", { name: "Kampf", exact: true });
  await expect(popover.getByRole("option")).toHaveText(["Kampf"]);
  await option.click();
  await expect(option).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();

  await chips.filter({ hasText: "Flug" }).click();
  await expect(chips).toHaveText(["Kampf"]);
  await tile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  expect(await readLinks(prisma)).toEqual(["Pilot:Kampf", "Scout:Kampf"]);
  await expectAuditEvents(prisma, ["ROLE_TAG_ASSIGNMENTS_UPDATED"]);
});

test("the roles table shows the tags of each role and filters by tag", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "tag-admin",
    permissionStrings: ["role;manage"],
  });
  const pilot = await createRole(prisma, { name: "Pilot" });
  const scout = await createRole(prisma, { name: "Scout" });
  await createRole(prisma, { name: "Logistiker" });
  const flight = await createRoleTag(prisma, {
    name: "Flug",
    roles: [pilot, scout],
  });
  const combat = await createRoleTag(prisma, { name: "Kampf", roles: [scout] });

  const roleRow = (name: string) =>
    page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name, exact: true }) });

  await signIn(admin.user);
  await page.goto("/app/iam/roles");
  // The cell of the tags has the names of all tags as its title
  await expect(roleRow("Scout").locator('td[title="Flug, Kampf"]')).toHaveText(
    "FlugKampf",
  );
  await expect(roleRow("Pilot").locator('td[title="Flug"]')).toHaveText("Flug");
  await expect(roleRow("Logistiker").getByText(/^(Flug|Kampf)$/)).toHaveCount(
    0,
  );

  const option = page.getByRole("option", { name: "Kampf", exact: true });
  await fillUntilVisible(
    page.getByRole("combobox", { name: "Tags" }),
    "Kampf",
    option,
  );
  await option.click();
  await expect(roleRow("Pilot")).toHaveCount(0);
  await expect(roleRow("Scout")).toBeVisible();
  await expect(roleRow("Logistiker")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`tags=${combat.id}`));

  // A role with one of the tags passes
  await page.goto(`/app/iam/roles?tags=${flight.id},${combat.id}`);
  await expect(roleRow("Pilot")).toBeVisible();
  await expect(roleRow("Scout")).toBeVisible();
  await expect(roleRow("Logistiker")).toHaveCount(0);
});

test("the role badge popover lists the tags, and a tag with only hidden roles does not reach the viewer", async ({
  page,
  prisma,
  signIn,
}) => {
  const pilot = await createRole(prisma, { name: "Pilot" });
  const secretRole = await createRole(prisma, { name: "Geheimrolle" });
  const viewer = await createCitizen(prisma, {
    handle: "rollen-leser",
    permissionStrings: ["citizen;read", `otherRole;read;roleId=${pilot.id}`],
  });
  const member = await createCitizen(prisma, { handle: "rollen-mitglied" });
  await assignRole(prisma, member.entity, pilot);
  await createRoleTag(prisma, {
    name: "Flugstaffel",
    description: "Alle fliegenden Rollen",
    roles: [pilot, secretRole],
  });
  await createRoleTag(prisma, { name: "Geheimtag", roles: [secretRole] });

  await signIn(viewer.user);
  await page.goto(`/app/spynet/citizen/${member.entity.id}/roles`);
  await waitForAppShellHydration(page);

  /**
   * The roles context of the page has the visible tags. The page shows no
   * tag before the popover opens, thus the page data has the visible tag.
   * It must not have the hidden tag or the hidden role of the visible tag.
   */
  const pageData = await page.content();
  expect(pageData).toContain("Flugstaffel");
  expect(pageData).not.toContain("Geheimtag");
  expect(pageData).not.toContain(secretRole.id);

  const popover = page.getByRole("dialog", { name: "Rollendetails" });
  await clickUntilVisible(
    page.getByRole("button").filter({ hasText: "Pilot" }),
    popover,
  );
  const tags = popover
    .getByRole("list", { name: "Tags" })
    .getByRole("listitem");
  await expect(tags).toHaveText(["Flugstaffel"]);
  await expect(popover.getByTitle("Alle fliegenden Rollen")).toBeVisible();
});

test("without role;manage, the IAM app has no tag page", async ({
  page,
  prisma,
  signIn,
}) => {
  const reader = await createCitizen(prisma, {
    handle: "benutzer-leser",
    permissionStrings: ["user;read"],
  });
  const tag = await createRoleTag(prisma, { name: "Flug" });

  await signIn(reader.user);
  await page.goto("/app/iam/users");
  await expect(
    page
      .getByRole("link", { name: "Benutzer", exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(tagsNavigationLink(page)).toHaveCount(0);

  await page.goto(`/app/iam/tags/${tag.id}`);
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
  await expect(page.getByText("Flug", { exact: true })).toHaveCount(0);
});
