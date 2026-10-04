import type { Page } from "@playwright/test";
import type { PrismaClient, User } from "@sam-monorepo/database/client";
import { createCitizen } from "../fixtures/factories";
import { clickUntilVisible, sectionByHeading } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The copy button of the "Internal ID" row in the overview of a citizen */
const copyButton = (page: Page) =>
  sectionByHeading(page, "Übersicht").getByRole("button", {
    name: "Kopieren",
  });

const feedback = (page: Page, text: string) =>
  page.getByRole("tooltip").filter({ hasText: text });

const openCitizen = async (
  page: Page,
  prisma: PrismaClient,
  signIn: (user: Pick<User, "id">) => Promise<void>,
) => {
  const reader = await createCitizen(prisma, {
    handle: "kopierer",
    permissionStrings: ["citizen;read"],
  });
  const target = await createCitizen(prisma, { handle: "kopiervorlage" });
  await signIn(reader.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);
  return target;
};

test("the copy button puts the value into the clipboard", async ({
  page,
  context,
  prisma,
  signIn,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const target = await openCitizen(page, prisma, signIn);

  await clickUntilVisible(copyButton(page), feedback(page, "Kopiert"));

  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    target.entity.id,
  );
});

test("the copy button tells when the browser refuses the copy", async ({
  page,
  prisma,
  signIn,
}) => {
  /** The browser refuses, for example without the clipboard permission */
  await page.addInitScript(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new DOMException("Refused", "NotAllowedError"));
  });
  await openCitizen(page, prisma, signIn);

  await clickUntilVisible(
    copyButton(page),
    feedback(page, "Kopieren fehlgeschlagen"),
  );
  await expect(feedback(page, "Kopiert")).toHaveCount(0);
});
