import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createUpload,
  createWikiPage,
  wikiDocument,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("a reader reports a page and its attachment, an admin resolves both", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const reader = await createCitizen(prisma, { handle: "wiki-leser" });

  const wikiPage = await createWikiPage(prisma, {
    title: "Fragwürdige Seite",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Steht so nicht mehr im Handbuch.")),
  });
  const attachment = await createUpload(prisma, reader.user, {
    fileName: "Anhang.pdf",
    mimeType: "application/pdf",
    wikiPageId: wikiPage.id,
  });
  /** The card only renders for an attachment the content actually embeds */
  await prisma.wikiPage.update({
    where: { id: wikiPage.id },
    data: {
      content: {
        type: "doc",
        content: [
          {
            type: "wikiAttachment",
            attrs: {
              uploadId: attachment.id,
              fileName: "Anhang.pdf",
              mimeType: "application/pdf",
            },
          },
        ],
      },
    },
  });

  await signIn(reader.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  /**
   * The page itself
   */
  const pageReportDialog = modal(page, "Seite melden");
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite melden" }),
    pageReportDialog,
  );
  await pageReportDialog.getByLabel("Grund").fill("Inhalt ist veraltet");
  await pageReportDialog.getByRole("button", { name: "Melden" }).click();
  await expect(pageReportDialog).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /**
   * … and its attachment, which carries its own report button
   */
  const attachmentReportDialog = modal(page, "Dateianhang melden");
  await clickUntilVisible(
    page.getByRole("button", { name: "Dateianhang melden" }),
    attachmentReportDialog,
  );
  await attachmentReportDialog
    .getByLabel("Grund")
    .fill("Datei gehört hier nicht hin");
  await attachmentReportDialog.getByRole("button", { name: "Melden" }).click();
  await expect(attachmentReportDialog).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const reports = await prisma.wikiPageReport.findMany({
    where: { pageId: wikiPage.id },
    orderBy: { createdAt: "asc" },
  });
  expect(reports).toHaveLength(2);
  expect(reports[0]).toMatchObject({
    message: "Inhalt ist veraltet",
    createdById: reader.entity.id,
    uploadId: null,
    resolvedAt: null,
  });
  expect(reports[1]).toMatchObject({
    message: "Datei gehört hier nicht hin",
    uploadId: attachment.id,
    uploadFileName: "Anhang.pdf",
    resolvedAt: null,
  });

  /**
   * The moderation queue lists both and closes them one by one
   */
  await switchUser(admin.user);
  await page.goto("/app/wiki/reports");

  for (const report of reports) {
    await expect(
      page.getByRole("row").filter({ hasText: report.message }),
    ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  }

  for (const report of reports) {
    await page.goto(`/app/wiki/reports/${report.id}`);
    await expect(page.getByText("Offen")).toBeVisible();

    await page
      .getByLabel("Kommentar (optional)")
      .fill(`Erledigt: ${report.message}`);
    await page
      .getByRole("button", { name: "Als bearbeitet markieren" })
      .click();

    await expect(page.getByText("Bearbeitet", { exact: true })).toBeVisible({
      timeout: ACTION_FEEDBACK_TIMEOUT,
    });
  }

  const resolved = await prisma.wikiPageReport.findMany({
    where: { pageId: wikiPage.id },
    orderBy: { createdAt: "asc" },
  });
  for (const report of resolved) {
    expect(report.resolvedAt).not.toBeNull();
    expect(report.resolvedById).toBe(admin.entity.id);
    expect(report.resolutionComment).toBe(`Erledigt: ${report.message}`);
  }

  // The open queue is empty, the resolved filter still finds them
  await page.goto("/app/wiki/reports");
  await expect(page.getByText("Keine Meldungen vorhanden")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await page.goto("/app/wiki/reports?status=resolved");
  await expect(
    page.getByRole("row").filter({ hasText: "Inhalt ist veraltet" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await expectAuditEvents(prisma, [
    "WIKI_PAGE_REPORTED",
    "WIKI_PAGE_REPORT_RESOLVED",
  ]);
});
