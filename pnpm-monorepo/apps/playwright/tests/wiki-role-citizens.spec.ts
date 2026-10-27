import type { Page } from "@playwright/test";
import {
  createCitizen,
  createRole,
  wikiDocument,
  wikiParagraph,
} from "../fixtures/factories";
import { modal, pickRole, rolePickerChips } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  expectPersisted,
  seedEditablePage,
} from "../fixtures/wiki-editor";

const MENU_TIMEOUT = 2_000;
const OPEN_DIALOG_TIMEOUT = 15_000;

const roleCitizensBlock = (page: Page) =>
  page.locator("[data-wiki-role-citizens]");

const configureBlock = (page: Page) =>
  page.getByRole("button", { name: "Konfigurieren" });

test("the dialog of a role member block picks, changes and removes the role", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "staffel-redakteur",
    permissionStrings: ["otherRole;read;roleId=*"],
  });
  const firstRole = await createRole(prisma, { name: "Staffel Alpha" });
  const secondRole = await createRole(prisma, { name: "Staffel Beta" });
  const wikiPage = await seedEditablePage(prisma, {
    title: "Staffelliste",
    content: wikiDocument(wikiParagraph("Alle Staffeln"), {
      type: "wikiRoleCitizens",
      attrs: { roleId: null },
    }),
  });

  await signIn(editor.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);

  const dialog = modal(page, "Rollenmitglieder konfigurieren");
  /**
   * A click on the block opens its menu, and a second click closes it. The
   * menu can still be open after the first dialog.
   */
  const openDialog = () =>
    expect(async () => {
      if (!(await configureBlock(page).isVisible()))
        await roleCitizensBlock(page).click();
      await configureBlock(page).click({ timeout: MENU_TIMEOUT });
      await expect(dialog).toBeVisible({ timeout: MENU_TIMEOUT });
    }).toPass({ timeout: OPEN_DIALOG_TIMEOUT });
  const apply = () =>
    dialog.getByRole("button", { name: "Übernehmen" }).click();

  await expect(page.getByText("Keine Rolle ausgewählt")).toBeVisible();

  /** Pick */
  await openDialog();
  await pickRole(
    dialog.getByRole("button", { name: "Rolle auswählen" }),
    firstRole.name,
  );
  await apply();
  await expect(dialog).not.toBeVisible();
  await expect(roleCitizensBlock(page)).toContainText(firstRole.name);
  await expectPersisted(prisma, wikiPage.id, "content").toContain(firstRole.id);

  /** Change: a pick replaces the role */
  await openDialog();
  await pickRole(
    dialog.getByRole("button", { name: firstRole.name }),
    secondRole.name,
  );
  await apply();
  await expect(roleCitizensBlock(page)).toContainText(secondRole.name);
  await expectPersisted(prisma, wikiPage.id, "content").toContain(
    secondRole.id,
  );
  await expectPersisted(prisma, wikiPage.id, "content").not.toContain(
    firstRole.id,
  );

  /** Remove: the block falls back to its state without a role */
  await openDialog();
  await pickRole(
    dialog.getByRole("button", { name: secondRole.name }),
    secondRole.name,
  );
  await expect(
    dialog.getByRole("button", { name: "Rolle auswählen" }),
  ).toBeVisible();
  await expect(rolePickerChips(dialog)).toHaveCount(0);
  await apply();
  await expect(page.getByText("Keine Rolle ausgewählt")).toBeVisible();
  await expectPersisted(prisma, wikiPage.id, "content").not.toContain(
    secondRole.id,
  );
});
