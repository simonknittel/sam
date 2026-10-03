import { WikiPageUploadKind } from "@sam-monorepo/database/client";
import path from "node:path";
import {
  createCitizen,
  createRole,
  createUserWithoutCitizen,
} from "../fixtures/factories";
import { waitForAppShellHydration } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  expectPersisted,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";

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
  await expect(page.getByText("Erfolgreich hochgeladen")).toBeVisible();

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
  await expect(iconImage).toBeVisible();
  // The natural width stays 0 until the browser has loaded the image
  await expect(iconImage).not.toHaveJSProperty("naturalWidth", 0);
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
  const wikiPage = await seedEditablePage(prisma, { title: "Bilderseite" });
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

  await expect(page.getByText('"upload.png" wurde eingefügt.')).toBeVisible();

  // The author is the citizen, and the assign route links the page at once
  const upload = await prisma.upload.findFirstOrThrow({
    select: {
      id: true,
      createdById: true,
      wikiPageLinks: { select: { pageId: true, kind: true } },
    },
  });
  expect(upload.createdById).toBe(manager.entity.id);
  expect(upload.wikiPageLinks).toEqual([
    { pageId: wikiPage.id, kind: WikiPageUploadKind.IMAGE },
  ]);

  // The editor loads the image straight from the bucket (anonymous read)
  const editorImage = page.locator(
    `.tiptap[contenteditable="true"] img[src*="${upload.id}"]`,
  );
  await expect(editorImage).toBeVisible();
  await expect(editorImage).not.toHaveJSProperty("naturalWidth", 0);

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

  await expectPersisted(prisma, wikiPage.id, "content").toContain(upload.id);

  // The read view renders the persisted image
  await page.reload();
  const readViewImage = page.locator(`article img[src*="${upload.id}"]`);
  await expect(readViewImage).toBeVisible();
  await expect(readViewImage).not.toHaveJSProperty("naturalWidth", 0);
});

/**
 * The author of an upload is a citizen. Admin mode gives all permissions,
 * thus only the missing citizen refuses the upload here.
 */
test("a user without a citizen cannot upload, also in admin mode", async ({
  page,
  prisma,
  signIn,
  enableAdminMode,
}) => {
  const user = await createUserWithoutCitizen(prisma, {
    name: "ohne-citizen",
    admin: true,
  });
  await signIn(user);
  await enableAdminMode();

  const response = await page.request.post("/api/upload", {
    data: { fileName: "upload.png", mimeType: "image/png", size: 1024 },
  });

  expect(response.status()).toBe(403);
  expect(await prisma.upload.count()).toBe(0);
});
