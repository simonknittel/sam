import { createCitizen } from "../fixtures/factories";
import { COLLAB_PERSISTENCE_TIMEOUT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";

/** Types "@<query>" and picks the suggestion showing the given handle */
const insertMention = async (
  page: import("@playwright/test").Page,
  handle: string,
) => {
  await page.keyboard.type(`@${handle.slice(0, 5)}`);
  const menu = page.getByRole("dialog", { name: "Vorschläge" });
  await menu
    .locator("[data-suggestion-index]:visible", { hasText: handle })
    .first()
    .click();
};

test("an @mention creates a pending link, removing it deletes the link", async ({
  page,
  prisma,
  signIn,
}) => {
  // citizen;read gates the mention suggestion list
  const editor = await createCitizen(prisma, {
    handle: "editor",
    permissionStrings: ["citizen;read"],
  });
  const mentioned = await createCitizen(prisma, { handle: "Zielperson" });
  const wikiPage = await seedEditablePage(prisma, { title: "Erwähnungen" });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  await focusEditor(page);
  await insertMention(page, "Zielperson");

  // The collab server persists and syncs with a 2s store debounce
  await expect
    .poll(
      () =>
        prisma.wikiPageCitizenMention.findUnique({
          where: {
            pageId_citizenId: {
              pageId: wikiPage.id,
              citizenId: mentioned.entity.id,
            },
          },
        }),
      { timeout: COLLAB_PERSISTENCE_TIMEOUT },
    )
    .toMatchObject({
      createdById: editor.entity.id,
      notifiedAt: null,
      suppressedAt: null,
    });

  // Removing the mention again cancels the pending link
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");

  await expect
    .poll(
      () =>
        prisma.wikiPageCitizenMention.count({ where: { pageId: wikiPage.id } }),
      { timeout: COLLAB_PERSISTENCE_TIMEOUT },
    )
    .toBe(0);
});

test("a self-mention is created suppressed", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "Selbstnenner",
    permissionStrings: ["citizen;read"],
  });
  const wikiPage = await seedEditablePage(prisma, {
    title: "Selbsterwähnung",
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  await focusEditor(page);
  await insertMention(page, "Selbstnenner");

  await expect
    .poll(
      () =>
        prisma.wikiPageCitizenMention.findUnique({
          where: {
            pageId_citizenId: {
              pageId: wikiPage.id,
              citizenId: editor.entity.id,
            },
          },
          select: { suppressedAt: true, notifiedAt: true },
        }),
      { timeout: COLLAB_PERSISTENCE_TIMEOUT },
    )
    .toEqual({ suppressedAt: expect.any(Date), notifiedAt: null });
});
