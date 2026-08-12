import { expect, type Page } from "@playwright/test";
import { clickUntilVisible } from "./interactions";

/**
 * The editor swallows clicks near block edges (invisible hover-menu
 * corridors) and element.focus() alone gives ProseMirror no selection —
 * focusing the contenteditable via JS and typing right away is the reliable
 * way in.
 */
export const focusEditor = async (page: Page) => {
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.evaluate((element) => (element as HTMLElement).focus());
  return editor;
};

/** Toggles a wiki page from the read view into the collab editor. */
export const enterEditMode = (page: Page) =>
  clickUntilVisible(
    page.locator('article button[aria-pressed="false"]'),
    page.locator('article button[aria-pressed="true"]'),
  );
