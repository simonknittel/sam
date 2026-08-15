import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  WikiPageEditability,
  WikiPageVisibility,
} from "../fixtures/factories";
import { expect, test } from "../fixtures/test";
import { enterEditMode } from "../fixtures/wiki-editor";

/**
 * Self-contained image so the tests need no upload stack — data srcs are
 * only rejected when PARSING pasted markup, stored documents render them.
 */
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='#38bdf8'/></svg>",
)}`;

const FLOW_TEXT =
  "Der Text umfließt das Bild an seiner Seite. " +
  "Wird der Textblock schmaler gezogen, bleibt das Bild an ihm verankert. " +
  "Dazu lebt das Bild als Inline-Knoten im Absatz selbst, dessen Box den " +
  "Float ausrichtet. So bleibt die Umflussgeometrie auch dann stimmig, " +
  "wenn der Absatz eine eigene Breite und Position hat.";

/** A paragraph narrower than the content column, so it sits centered */
const narrowParagraph = () => ({
  type: "paragraph",
  attrs: { widthPx: 480 },
  content: [{ type: "text", text: FLOW_TEXT }],
});

test("the image menu floats a block image into the neighboring paragraph", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Umflossene Bilder",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
    content: wikiDocument(
      { type: "image", attrs: { src: IMAGE_SRC, widthPx: 240 } },
      narrowParagraph(),
    ),
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);

  const editorRoot = page.locator('.tiptap[contenteditable="true"]');
  await editorRoot.locator("img").hover();
  await page
    .getByRole("button", { name: "Vom Text umflossen (links)" })
    .click();

  const floatedImage = editorRoot.locator("p a[data-wiki-float-image]");
  await expect(floatedImage).toHaveAttribute("data-float-side", "left");
  await expect(floatedImage).toHaveCSS("float", "left");

  /**
   * The core of the feature: the float aligns with the text block's OWN
   * box — the paragraph is a centered, independently sized column, so its
   * left edge sits well inside the editor's.
   */
  const paragraphBox = await editorRoot
    .locator("p", { hasText: "Der Text umfließt" })
    .boundingBox();
  const imageBox = await floatedImage.boundingBox();
  const editorBox = await editorRoot.boundingBox();
  if (!paragraphBox || !imageBox || !editorBox)
    throw new Error("Expected the boxes to be measurable");
  expect(Math.abs(imageBox.x - paragraphBox.x)).toBeLessThan(2);
  expect(paragraphBox.x).toBeGreaterThan(editorBox.x + 50);

  // The floated image keeps its own resize handles
  await floatedImage.hover();
  await expect(
    page.getByRole("separator", { name: "Breite ändern" }),
  ).toHaveCount(2);

  // The collab server persists the converted document with a 2s debounce
  await expect
    .poll(
      async () => {
        const stored = await prisma.wikiPage.findUniqueOrThrow({
          where: { id: wikiPage.id },
          select: { content: true },
        });
        return JSON.stringify(stored.content);
      },
      { timeout: 20_000 },
    )
    .toContain('"wikiFloatImage"');

  // The static read view renders the same float
  await page.reload();
  await expect(
    page.locator("[data-wiki-static-content] p a[data-wiki-float-image]"),
  ).toHaveCSS("float", "left");
});

test("a floated image switches sides and unfloats back into a block image", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Umfluss wechseln",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
    content: wikiDocument({
      type: "paragraph",
      attrs: { widthPx: 480 },
      content: [
        {
          type: "wikiFloatImage",
          attrs: { src: IMAGE_SRC, widthPx: 240, floatSide: "left" },
        },
        { type: "text", text: FLOW_TEXT },
      ],
    }),
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);

  const editorRoot = page.locator('.tiptap[contenteditable="true"]');
  const floatedImage = editorRoot.locator("a[data-wiki-float-image]");

  await floatedImage.locator("img").hover();
  await page
    .getByRole("button", { name: "Vom Text umflossen (rechts)" })
    .click();
  await expect(floatedImage).toHaveAttribute("data-float-side", "right");
  await expect(floatedImage).toHaveCSS("float", "right");

  await floatedImage.locator("img").hover();
  await page
    .getByRole("button", { name: "Nicht mehr vom Text umfließen" })
    .click();

  // Back to a block image at the top level, before the paragraph
  await expect(floatedImage).toHaveCount(0);
  const blockImage = editorRoot.locator("> a[data-wiki-image]");
  await expect(blockImage).toBeVisible();
  await expect(editorRoot.locator("> :first-child")).toHaveAttribute(
    "data-wiki-image",
    "",
  );
});
