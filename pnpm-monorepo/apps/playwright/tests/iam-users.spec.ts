import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  SAVED_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const USER_ADMIN_PERMISSIONS = ["user;read", "user;ban", "user;manage"];

test("banning a user revokes their sessions, unbanning lets them back in", async ({
  page,
  prisma,
  signIn,
  switchUser,
  context,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "benutzer-verwalter",
    permissionStrings: USER_ADMIN_PERMISSIONS,
  });
  const target = await createCitizen(prisma, { handle: "zu-sperrender" });

  /**
   * The ban's mechanism is session revocation, so the target needs a live
   * session to lose. Its cookie is kept to prove it stops working.
   */
  await signIn(target.user);
  const targetCookies = await context.cookies();
  await page.goto("/app/dashboard");
  await expect(
    page.getByRole("heading", { name: "zu-sperrender" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await switchUser(admin.user);
  await page.goto("/app/iam/users");

  const targetRow = page.getByRole("row").filter({ hasText: target.user.id });
  await expect(targetRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const banDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    targetRow.getByRole("button", { name: "Benutzer sperren" }),
    banDialog,
  );
  await banDialog.getByLabel("Grund (optional)").fill("Regelverstoß");
  await banDialog.getByRole("button", { name: "Sperren" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const banned = await prisma.user.findUniqueOrThrow({
        where: { id: target.user.id },
        select: { bannedAt: true, bannedById: true, bannedReason: true },
      });
      return {
        banned: banned.bannedAt !== null,
        bannedById: banned.bannedById,
        bannedReason: banned.bannedReason,
      };
    })
    .toEqual({
      banned: true,
      bannedById: admin.entity.id,
      bannedReason: "Regelverstoß",
    });

  // Their sessions are gone, so the browser they were using is logged out
  expect(
    await prisma.session.count({ where: { userId: target.user.id } }),
  ).toBe(0);
  await expect(targetRow.getByText("Gesperrt")).toBeVisible();

  await context.clearCookies();
  await context.addCookies(targetCookies);
  await page.goto("/app/dashboard");
  /**
   * The cookie is still there, so the proxy waves it through and the page
   * itself sends them to the login — which is why the deep link is not
   * preserved here.
   */
  await expect(page).toHaveURL("/", { timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  /**
   * Unbanning clears the block. That a banned user is also refused at the
   * login itself lives in the OAuth callback, which the suite deliberately
   * does not drive (see the README's auth section).
   */
  await switchUser(admin.user);
  await page.goto("/app/iam/users");

  const unbanDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    targetRow.getByRole("button", { name: "Benutzer entsperren" }),
    unbanDialog,
  );
  await unbanDialog.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const unbanned = await prisma.user.findUniqueOrThrow({
        where: { id: target.user.id },
        select: { bannedAt: true, bannedReason: true },
      });
      return unbanned;
    })
    .toEqual({ bannedAt: null, bannedReason: null });
  await expect(
    targetRow.getByRole("button", { name: "Benutzer sperren" }),
  ).toBeVisible();

  await expectAuditEvents(prisma, ["USER_BANNED", "USER_UNBANNED"]);
});

test("an admin confirms the privacy policy on behalf of a user", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "benutzer-verwalter",
    permissionStrings: USER_ADMIN_PERMISSIONS,
  });
  const target = await createCitizen(prisma, { handle: "unbestaetigter" });
  /** Whoever never confirmed it: the factory confirms it for sign-in's sake */
  await prisma.user.update({
    where: { id: target.user.id },
    data: { emailVerified: null },
  });

  await signIn(admin.user);
  await page.goto("/app/iam/users");

  const targetRow = page.getByRole("row").filter({ hasText: target.user.id });
  await expect(targetRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  const confirmDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    targetRow.getByRole("button", { name: "Bestätigen" }),
    confirmDialog,
  );
  await confirmDialog.getByRole("button", { name: "Bestätigen" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const confirmed = await prisma.user.findUniqueOrThrow({
        where: { id: target.user.id },
        select: { emailVerified: true },
      });
      return confirmed.emailVerified !== null;
    })
    .toBe(true);
  await expect(
    targetRow.getByRole("button", { name: "Bestätigen" }),
  ).toHaveCount(0);

  await expectAuditEvents(prisma, ["EMAIL_VERIFIED"]);
});
