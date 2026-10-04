import type { Locator, Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { hoverUntilVisible, modal } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";

/**
 * The palette entries below open a dialog. When the palette closes, it must
 * not take the focus from the dialog. If it does, the typed text goes into
 * the page behind the dialog.
 */

enum Palette {
  Slash = "slash palette",
  Gutter = "gutter palette",
}

enum PickMethod {
  Keyboard = "keyboard",
  Mouse = "mouse",
}

interface DialogEntry {
  /** Title of the palette entry */
  readonly title: string;
  readonly dialogName: RegExp;
  /** The element of the dialog that must have the focus */
  readonly focusTarget: (dialog: Locator) => Locator;
}

const DIALOG_ENTRIES: readonly DialogEntry[] = [
  {
    title: "Link",
    dialogName: /^Link$/,
    /**
     * In a paragraph, no field of the link dialog has autoFocus. Thus the
     * dialog focuses its first focusable element, the close button.
     */
    focusTarget: (dialog) => dialog.getByRole("button", { name: "Schließen" }),
  },
  {
    title: "Einbetten",
    dialogName: /^Einbetten$/,
    focusTarget: (dialog) => dialog.getByRole("textbox", { name: "Einbetten" }),
  },
  {
    title: "Schiff",
    dialogName: /^Schiff$/,
    focusTarget: (dialog) =>
      dialog.getByRole("combobox", { name: "Schiff suchen" }),
  },
];

/** Opens the palette, types the filter and returns the palette */
const openFilteredPalette = async (
  page: Page,
  palette: Palette,
  filter: string,
) => {
  switch (palette) {
    case Palette.Slash:
      // The palette opens only when "/" follows a space or a block start
      await focusEditor(page);
      await page.keyboard.type(`/${filter}`);
      return page.getByRole("dialog", { name: "Vorschläge" });

    case Palette.Gutter: {
      const insertButton = page.getByRole("button", {
        name: "Block darunter einfügen (Alt: darüber)",
      });
      await hoverUntilVisible(
        page.locator('.tiptap[contenteditable="true"] p').first(),
        insertButton,
      );
      await insertButton.click();
      const menu = page.getByRole("dialog", { name: "Block einfügen" });
      await expect(
        menu.getByRole("textbox", { name: "Blocktypen filtern" }),
      ).toBeFocused();
      await page.keyboard.type(filter);
      return menu;
    }

    default:
      throw new Error(`Unknown palette: ${palette satisfies never}`);
  }
};

const pickEntry = async (page: Page, entry: Locator, method: PickMethod) => {
  switch (method) {
    case PickMethod.Keyboard:
      // The palette highlights its first entry
      await page.keyboard.press("Enter");
      break;

    case PickMethod.Mouse:
      await entry.click();
      break;

    default:
      throw new Error(`Unknown pick method: ${method satisfies never}`);
  }
};

for (const palette of Object.values(Palette)) {
  test(`the dialog of a ${palette} entry keeps the focus`, async ({
    page,
    prisma,
    signIn,
  }) => {
    const editor = await createCitizen(prisma, { handle: "editor" });
    const wikiPage = await seedEditablePage(prisma, { title: "Fokus" });
    await signIn(editor.user);

    await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
    await enterEditMode(page);

    for (const { title, dialogName, focusTarget } of DIALOG_ENTRIES) {
      for (const method of Object.values(PickMethod)) {
        await test.step(`${title} with the ${method}`, async () => {
          const menu = await openFilteredPalette(
            page,
            palette,
            title.toLowerCase(),
          );
          const entry = menu.getByRole("button");
          await expect(entry).toHaveCount(1);
          await expect(entry).toHaveAccessibleName(title);
          await pickEntry(page, entry, method);

          const dialog = modal(page, dialogName);
          const target = focusTarget(dialog);
          await expect(target).toBeFocused();
          // A palette can take the focus back some frames later
          await page.keyboard.type("x");
          await expect(target).toBeFocused();

          await dialog.getByRole("button", { name: "Schließen" }).click();
          await expect(dialog).toBeHidden();
        });
      }
    }
  });
}
