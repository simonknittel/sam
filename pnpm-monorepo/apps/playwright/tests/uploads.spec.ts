import path from "node:path";
import {
  createCitizen,
  createRole,
  createWikiPage,
  WikiPageEditability,
  WikiPageVisibility,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { enterEditMode, focusEditor } from "../fixtures/wiki-editor";

/** 64x48 PNG — the dimension probe persists these on the Upload row. */
const imagePath = path.join(
  __dirname,
  "..",
  "fixtures",
  "assets",
  "upload.png",
);
const IMAGE_WIDTH = 64;
const IMAGE_HEIGHT = 48;

/**
 * The dimension probe runs after the assign response (next/server after())
 * and needs S3 round trips of its own.
 */
const PROBE_TIMEOUT = 20_000;

test("a role icon uploaded through the UI is stored and displayed", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "icon-admin",
    permissionStrings: ["role;manage"],
  });
  const role = await createRole(prisma, { name: "Bildrolle" });
  await signIn(admin.user);

  await page.goto(`/app/roles/${role.id}`);
  await waitForAppShellHydration(page);

  // The icon upload is the first of the two hidden file inputs (icon,
  // thumbnail) in the "Bilder" section
  await page.locator('input[type="file"]').first().setInputFiles(imagePath);
  await expect(page.getByText("Erfolgreich hochgeladen")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  // The upload lands in the bucket and the probe reads it back from there
  await expect
    .poll(
      async () => {
        const stored = await prisma.role.findUniqueOrThrow({
          where: { id: role.id },
          select: { icon: true },
        });
        return stored.icon
          ? { width: stored.icon.width, height: stored.icon.height }
          : null;
      },
      { timeout: PROBE_TIMEOUT },
    )
    .toEqual({ width: IMAGE_WIDTH, height: IMAGE_HEIGHT });

  const { icon } = await prisma.role.findUniqueOrThrow({
    where: { id: role.id },
    include: { icon: true },
  });

  // The refreshed page renders the icon from the bucket (via the image
  // optimizer, which fetches it server-side)
  const iconImage = page.locator(`img[src*="${icon!.id}"]`).first();
  await expect(iconImage).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect
    .poll(
      () =>
        iconImage.evaluate(
          (element) => (element as HTMLImageElement).naturalWidth,
        ),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBeGreaterThan(0);
});

test("an image uploaded to a wiki page is stored, displayed and persisted", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-manager",
    permissionStrings: ["wiki;manage"],
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Bilderseite",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
  });
  await signIn(manager.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  await focusEditor(page);

  // The toolbar's image button opens a native file picker
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Bild einfügen", exact: true })
    .click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(imagePath);

  await expect(page.getByText('"upload.png" wurde eingefügt.')).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const upload = await prisma.upload.findFirstOrThrow({
    select: { id: true, wikiPages: { select: { id: true } } },
  });
  expect(upload.wikiPages.map(({ id }) => id)).toContain(wikiPage.id);

  // The editor loads the image straight from the bucket (anonymous read)
  const editorImage = page.locator(
    `.tiptap[contenteditable="true"] img[src*="${upload.id}"]`,
  );
  await expect(editorImage).toBeVisible();
  await expect
    .poll(
      () =>
        editorImage.evaluate(
          (element) => (element as HTMLImageElement).naturalWidth,
        ),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBeGreaterThan(0);

  // The probe persists the dimensions read back from the bucket
  await expect
    .poll(
      async () => {
        const stored = await prisma.upload.findUniqueOrThrow({
          where: { id: upload.id },
          select: { width: true, height: true },
        });
        return { width: stored.width, height: stored.height };
      },
      { timeout: PROBE_TIMEOUT },
    )
    .toEqual({ width: IMAGE_WIDTH, height: IMAGE_HEIGHT });

  // The collab server persists the content with a 2s store debounce
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
    .toContain(upload.id);

  // The read view renders the persisted image
  await page.reload();
  const readViewImage = page.locator(`article img[src*="${upload.id}"]`);
  await expect(readViewImage).toBeVisible();
  await expect
    .poll(
      () =>
        readViewImage.evaluate(
          (element) => (element as HTMLImageElement).naturalWidth,
        ),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBeGreaterThan(0);
});
