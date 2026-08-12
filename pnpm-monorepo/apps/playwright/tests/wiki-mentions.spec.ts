import {
  createCitizen,
  createWikiPage,
  WikiPageEditability,
  WikiPageVisibility,
} from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

/**
 * The editor swallows clicks near block edges (invisible hover-menu
 * corridors) and element.focus() alone gives ProseMirror no selection —
 * focusing the contenteditable via JS and typing right away is the reliable
 * way in.
 */
const focusEditor = async (page: import("@playwright/test").Page) => {
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.evaluate((element) => (element as HTMLElement).focus());
  return editor;
};

/**
 * A click landing before React hydrates is swallowed — retry until the
 * toggle reports pressed.
 */
const enterEditMode = async (page: import("@playwright/test").Page) => {
  await expect(async () => {
    await page
      .locator('article button[aria-pressed="false"]')
      .click({ timeout: 2_000 });
    await expect(
      page.locator('article button[aria-pressed="true"]'),
    ).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
};

/** Types "@<query>" and picks the suggestion showing the given handle */
const insertMention = async (
  page: import("@playwright/test").Page,
  handle: string,
) => {
  await page.keyboard.type(`@${handle.slice(0, 5)}`);
  const menu = page.getByRole("dialog");
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
  const wikiPage = await createWikiPage(prisma, {
    title: "Erwähnungen",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
  });
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
      { timeout: 20_000 },
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
      { timeout: 20_000 },
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
  const wikiPage = await createWikiPage(prisma, {
    title: "Selbsterwähnung",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
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
      { timeout: 20_000 },
    )
    .toEqual({ suppressedAt: expect.any(Date), notifiedAt: null });
});
