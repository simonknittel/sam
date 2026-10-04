import type { Locator, Page } from "@playwright/test";
import { createCitizen, createVariant } from "../fixtures/factories";
import { clickUntilVisible, modal } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  expectPersisted,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";

const pickerInput = (picker: Locator) =>
  picker.getByRole("combobox", { name: "Schiff suchen" });

/**
 * Opens the ship picker through the slash palette. The palette opens only
 * when "/" follows a space or a block start. The palette must not take the
 * focus back from the input of the picker when it closes.
 */
const openShipPicker = async (
  page: Page,
  pickEntry: (entry: Locator) => Promise<void>,
) => {
  await page.keyboard.type("/schiff");
  const entry = page
    .getByRole("dialog", { name: "Vorschläge" })
    .getByRole("button", { name: "Schiff", exact: true });
  await expect(entry).toBeVisible();
  await pickEntry(entry);
  const picker = modal(page, /^Schiff$/);
  await expect(pickerInput(picker)).toBeFocused();
  return picker;
};

const pickWithEnter = (page: Page) => () => page.keyboard.press("Enter");

const pickWithClick = (entry: Locator) => entry.click();

const shipOptions = (picker: Locator) =>
  picker.getByRole("listbox", { name: "Schiffe" }).getByRole("option");

test("the ship picker filters, and the keyboard or the mouse picks a ship", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const wikiPage = await seedEditablePage(prisma, { title: "Flotte" });
  const { variant: carrack } = await createVariant(prisma, {
    manufacturerName: "Anvil Aerospace",
    seriesName: "Carrack",
    variantName: "Carrack",
  });
  const { series: cutlassSeries } = await createVariant(prisma, {
    manufacturerName: "Drake Interplanetary",
    seriesName: "Cutlass",
    variantName: "Cutlass Black",
  });
  const cutlassRed = await prisma.variant.create({
    data: { name: "Cutlass Red", seriesId: cutlassSeries.id },
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  const editorElement = await focusEditor(page);
  const variantLink = (variantId: string) =>
    editorElement.locator(`[data-wiki-variant-link="${variantId}"]`);

  // Escape closes the picker without a link
  let picker = await openShipPicker(page, pickWithEnter(page));
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(editorElement.locator("[data-wiki-variant-link]")).toHaveCount(
    0,
  );

  // The filter also matches the manufacturer, and the first ship is highlighted
  await focusEditor(page);
  picker = await openShipPicker(page, pickWithEnter(page));
  await page.keyboard.type("drake");
  await expect(shipOptions(picker)).toHaveCount(2);
  await expect(shipOptions(picker).first()).toContainText("Cutlass Black");
  await expect(shipOptions(picker).first()).toHaveAttribute("data-highlighted");

  await page.keyboard.press("ArrowDown");
  await expect(
    shipOptions(picker).filter({ hasText: "Cutlass Red" }),
  ).toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(picker).toBeHidden();
  await expect(variantLink(cutlassRed.id)).toBeVisible();

  // After a click on the palette entry, the picker keeps the focus too, and a click picks the ship under the mouse
  await focusEditor(page);
  picker = await openShipPicker(page, pickWithClick);
  await expect(shipOptions(picker)).toHaveCount(3);
  await page.keyboard.type("anvil");
  await expect(shipOptions(picker)).toHaveCount(1);
  await shipOptions(picker).filter({ hasText: "Carrack" }).click();
  await expect(picker).toBeHidden();
  await expect(variantLink(carrack.id)).toBeVisible();

  await expectPersisted(prisma, wikiPage.id, "content").toContain(carrack.id);
  await expectPersisted(prisma, wikiPage.id, "content").toContain(
    cutlassRed.id,
  );
});

test("Enter in the ship picker changes a link to the first ship", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const { variant: carrack } = await createVariant(prisma, {
    manufacturerName: "Anvil Aerospace",
    seriesName: "Carrack",
    variantName: "Carrack",
  });
  const { variant: cutlass } = await createVariant(prisma, {
    manufacturerName: "Drake Interplanetary",
    seriesName: "Cutlass",
    variantName: "Cutlass Black",
  });
  const wikiPage = await seedEditablePage(prisma, {
    title: "Flotte",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "wikiVariantLink",
              attrs: { variantId: carrack.id, name: carrack.name },
            },
          ],
        },
      ],
    },
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  const editorElement = page.locator('.tiptap[contenteditable="true"]');

  const picker = modal(page, "Schiff ändern");
  await clickUntilVisible(
    editorElement.locator(`[data-wiki-variant-link="${carrack.id}"]`),
    page.getByRole("button", { name: "Schiff ändern" }),
  );
  await page.getByRole("button", { name: "Schiff ändern" }).click();
  await expect(pickerInput(picker)).toBeFocused();

  await page.keyboard.type("cutlass");
  await expect(shipOptions(picker)).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(picker).toBeHidden();

  await expect(
    editorElement.locator(`[data-wiki-variant-link="${cutlass.id}"]`),
  ).toBeVisible();
  await expectPersisted(prisma, wikiPage.id, "content").toContain(cutlass.id);
  await expectPersisted(prisma, wikiPage.id, "content").not.toContain(
    carrack.id,
  );
});
