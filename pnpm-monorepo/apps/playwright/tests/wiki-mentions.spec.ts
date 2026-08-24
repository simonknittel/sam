import { createCitizen } from "../fixtures/factories";
import { COLLAB_PERSISTENCE_TIMEOUT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";

/**
 * Types "@<handle>" and picks the suggestion showing it. The full handle is
 * typed on purpose: a prefix would also offer everyone sharing it.
 */
const insertMention = async (
  page: import("@playwright/test").Page,
  handle: string,
) => {
  await page.keyboard.type(`@${handle}`);
  const menu = page.getByRole("dialog", { name: "Vorschläge" });
  await menu
    .locator("[data-suggestion-index]:visible", { hasText: handle })
    .first()
    .click();
};

test("@mentions link the mentioned citizens, a self-mention already suppressed", async ({
  page,
  prisma,
  signIn,
}) => {
  // citizen;read gates the mention suggestion list
  const editor = await createCitizen(prisma, {
    handle: "Selbstnenner",
    permissionStrings: ["citizen;read"],
  });
  const mentioned = await createCitizen(prisma, { handle: "Zielperson" });
  const wikiPage = await seedEditablePage(prisma, { title: "Erwähnungen" });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  await focusEditor(page);
  await insertMention(page, "Zielperson");
  await page.keyboard.type(" ");
  await insertMention(page, "Selbstnenner");

  const mentionOf = (citizenId: string) =>
    prisma.wikiPageCitizenMention.findUnique({
      where: { pageId_citizenId: { pageId: wikiPage.id, citizenId } },
      select: {
        createdById: true,
        notifiedAt: true,
        suppressedAt: true,
      },
    });

  // The collab server persists and syncs with a 2s store debounce
  await expect
    .poll(() => mentionOf(mentioned.entity.id), {
      timeout: COLLAB_PERSISTENCE_TIMEOUT,
    })
    .toEqual({
      createdById: editor.entity.id,
      notifiedAt: null,
      suppressedAt: null,
    });

  // Mentioning yourself never notifies you, so its link starts suppressed
  await expect
    .poll(() => mentionOf(editor.entity.id), {
      timeout: COLLAB_PERSISTENCE_TIMEOUT,
    })
    .toEqual({
      createdById: editor.entity.id,
      notifiedAt: null,
      suppressedAt: expect.any(Date),
    });

  // Removing the mentions again cancels the pending links
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
