import type { PrismaClient, User } from "@sam-monorepo/database/client";
import path from "node:path";
import {
  createCitizen,
  createRole,
  createWikiPage,
  WikiPageVisibility,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { readStackState, s3BucketName } from "../setup/stack";

const imagePath = path.join(
  __dirname,
  "..",
  "fixtures",
  "assets",
  "upload.png",
);

/** Deleting the object in the bucket happens after the action responded. */
const BUCKET_TIMEOUT = 15_000;

/**
 * `Upload.fileName` is stored URI-encoded, so seeded rows have to encode
 * like the upload endpoints do — the table decodes it for display again.
 */
const createUpload = (
  prisma: PrismaClient,
  user: Pick<User, "id">,
  {
    fileName,
    mimeType,
    size,
    wikiPageId,
  }: {
    fileName: string;
    mimeType: string;
    size: number;
    wikiPageId?: string;
  },
) =>
  prisma.upload.create({
    data: {
      fileName: encodeURIComponent(fileName),
      mimeType,
      size,
      createdById: user.id,
      ...(wikiPageId ? { wikiPages: { connect: { id: wikiPageId } } } : {}),
    },
  });

const objectUrl = (uploadId: string) => {
  const { s3Port } = readStackState();
  return `http://localhost:${s3Port}/${s3BucketName}/${uploadId}`;
};

test("a user's own uploads are listed with the place they are used", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "bilderhochlader",
    permissionStrings: ["role;manage"],
  });
  const role = await createRole(prisma, { name: "Bildrolle" });
  await signIn(citizen.user);

  // Upload a role icon through the existing flow
  await page.goto(`/app/roles/${role.id}`);
  await waitForAppShellHydration(page);
  await page.locator('input[type="file"]').first().setInputFiles(imagePath);
  await expect(page.getByText("Erfolgreich hochgeladen")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/uploads");

  const row = page.getByRole("row").filter({ hasText: "upload.png" });
  await expect(row).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(row.getByText("Rollen-Icon")).toBeVisible();

  // The file name opens the object in the bucket
  const upload = await prisma.upload.findFirstOrThrow();
  await expect(row.getByRole("link", { name: "upload.png" })).toHaveAttribute(
    "href",
    objectUrl(upload.id),
  );

  // The location links to the role the icon sits on
  const roleLink = row.getByRole("link", { name: "Bildrolle" });
  await expect(roleLink).toHaveAttribute("href", `/app/roles/${role.id}`);

  // Without upload;manage there is neither an author nor anything to act on
  await expect(
    page.getByRole("columnheader", { name: "Hochgeladen von" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Löschen" })).toHaveCount(0);
});

test("uploads of other users stay hidden without the permission", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "ohne-einblick" });
  const stranger = await createCitizen(prisma, { handle: "fremder-lader" });
  await createUpload(prisma, stranger.user, {
    fileName: "Fremdes Dokument.pdf",
    mimeType: "application/pdf",
    size: 2048,
  });

  await signIn(citizen.user);
  await page.goto("/app/uploads");

  await expect(
    page.getByText("Du hast bisher keine Dateien hochgeladen."),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByText("Fremdes Dokument.pdf")).toHaveCount(0);
});

test("a manager sees every upload with its author and can filter them", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "upload-verwalter",
    permissionStrings: ["upload;manage", "wiki;manage"],
  });
  const stranger = await createCitizen(prisma, { handle: "fremder-lader" });

  const wikiPage = await createWikiPage(prisma, {
    title: "Fremdseite",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await createUpload(prisma, stranger.user, {
    fileName: "Fremdes Dokument.pdf",
    mimeType: "application/pdf",
    size: 2048,
    wikiPageId: wikiPage.id,
  });
  await createUpload(prisma, stranger.user, {
    fileName: "Verwaiste Notiz.txt",
    mimeType: "text/plain",
    size: 64,
  });

  await signIn(manager.user);
  await page.goto("/app/uploads");

  // Both foreign uploads show up, attributed to their author
  const usedRow = page
    .getByRole("row")
    .filter({ hasText: "Fremdes Dokument.pdf" });
  await expect(usedRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(usedRow.getByText("fremder-lader")).toBeVisible();
  await expect(
    usedRow.getByRole("link", { name: "Fremdseite" }),
  ).toHaveAttribute("href", `/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  const unusedRow = page
    .getByRole("row")
    .filter({ hasText: "Verwaiste Notiz.txt" });
  await expect(unusedRow.getByText("Unbenutzt", { exact: true })).toBeVisible();

  // The usage filter keeps only the upload nothing references
  await page.goto("/app/uploads?usage=unused");
  await expect(
    page.getByRole("row").filter({ hasText: "Verwaiste Notiz.txt" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByRole("row").filter({ hasText: "Fremdes Dokument.pdf" }),
  ).toHaveCount(0);

  // The file name search matches the URI-encoded name transparently
  await page.goto("/app/uploads?q=Fremdes+Dokument");
  await expect(
    page.getByRole("row").filter({ hasText: "Fremdes Dokument.pdf" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByRole("row").filter({ hasText: "Verwaiste Notiz.txt" }),
  ).toHaveCount(0);

  // The author filter keeps only that author's uploads
  await page.goto(`/app/uploads?createdById=${manager.user.id}`);
  await expect(page.getByText("Keine Uploads für diese Filter.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
});

test("a manager deletes an upload from the database and the bucket", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "upload-loescher",
    permissionStrings: ["upload;manage", "role;manage"],
  });
  const role = await createRole(prisma, { name: "Bildrolle" });
  await signIn(manager.user);

  await page.goto(`/app/roles/${role.id}`);
  await waitForAppShellHydration(page);
  await page.locator('input[type="file"]').first().setInputFiles(imagePath);
  await expect(page.getByText("Erfolgreich hochgeladen")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const upload = await prisma.upload.findFirstOrThrow();
  await expect
    .poll(async () => (await fetch(objectUrl(upload.id))).status, {
      timeout: BUCKET_TIMEOUT,
    })
    .toBe(200);

  await page.goto("/app/uploads");

  const row = page.getByRole("row").filter({ hasText: "upload.png" });
  await clickUntilVisible(
    row.getByRole("button", { name: '"upload.png" löschen' }),
    page.getByRole("alertdialog"),
  );

  // The dialog names the place the upload is still embedded in
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText("Rollen-Icon:")).toBeVisible();
  await expect(dialog.getByText("Bildrolle")).toBeVisible();

  await dialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText("Erfolgreich gelöscht")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(row).toHaveCount(0);

  await expect
    .poll(() => prisma.upload.count({ where: { id: upload.id } }))
    .toBe(0);

  // The role keeps existing, only its icon reference is nulled
  const storedRole = await prisma.role.findUniqueOrThrow({
    where: { id: role.id },
  });
  expect(storedRole.iconId).toBeNull();

  // The object is gone from the bucket too
  await expect
    .poll(async () => (await fetch(objectUrl(upload.id))).status, {
      timeout: BUCKET_TIMEOUT,
    })
    .toBe(404);

  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "UPLOAD_DELETED" },
  });
  expect(auditEvent).not.toBeNull();
});

test("deleting is forbidden without the permission", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "ohne-loeschrecht",
    permissionStrings: ["role;manage"],
  });
  const role = await createRole(prisma, { name: "Bildrolle" });
  await signIn(citizen.user);

  await page.goto(`/app/roles/${role.id}`);
  await waitForAppShellHydration(page);
  await page.locator('input[type="file"]').first().setInputFiles(imagePath);
  await expect(page.getByText("Erfolgreich hochgeladen")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const upload = await prisma.upload.findFirstOrThrow();

  await page.goto("/app/uploads");
  await expect(
    page.getByRole("row").filter({ hasText: "upload.png" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  // No actions column is rendered at all — the row survives regardless
  await expect(page.getByRole("button", { name: "Löschen" })).toHaveCount(0);
  expect(await prisma.upload.count({ where: { id: upload.id } })).toBe(1);
});
