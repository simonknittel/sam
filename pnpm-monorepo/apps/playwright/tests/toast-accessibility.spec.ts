import {
  createCitizen,
  createWikiPage,
  WikiPageVisibility,
} from "../fixtures/factories";
import {
  accessibilityTree,
  clickUntilVisible,
  modal,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The answer of the report action when a user has too many open reports */
const TOO_MANY_REPORTS_ERROR =
  "Du hast bereits zu viele offene Meldungen. Bitte warte, bis diese bearbeitet wurden.";

/** The limit of the open reports of a user (see createWikiPageReport) */
const MAX_OPEN_REPORTS_PER_USER = 5;

test("an error toast stays in the accessibility tree while a modal dialog is open", async ({
  page,
  prisma,
  signIn,
}) => {
  const reader = await createCitizen(prisma, { handle: "wiki-leser" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await prisma.wikiPageReport.createMany({
    data: Array.from({ length: MAX_OPEN_REPORTS_PER_USER }, (_, index) => ({
      pageId: wikiPage.id,
      message: `Meldung ${index + 1}`,
      createdById: reader.entity.id,
    })),
  });

  await signIn(reader.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  const dialog = modal(page, "Seite melden");
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite melden" }),
    dialog,
  );
  await dialog.getByLabel("Grund").fill("Inhalt ist veraltet");
  await dialog.getByRole("button", { name: "Melden" }).click();

  /** The error does not close the dialog, and only the toast shows it */
  await expect(page.getByText(TOO_MANY_REPORTS_ERROR)).toBeVisible();
  await expect(dialog).toBeVisible();

  /**
   * The open dialog hides the page behind it from screen readers, for
   * example the notification button of the top bar, but not the toast
   */
  const nodes = await accessibilityTree(page);
  expect(nodes.map((node) => node.name)).toContain(TOO_MANY_REPORTS_ERROR);
  expect(
    nodes
      .filter((node) => node.role === "button")
      .map((node) => node.name.toLowerCase()),
  ).not.toContain("benachrichtigungen");
});
