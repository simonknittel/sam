import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen } from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  SAVED_TEXT,
  toggleLabel,
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
  ).toBeVisible();

  await switchUser(admin.user);
  await page.goto("/app/iam/users");

  const targetRow = page.getByRole("row").filter({ hasText: target.user.id });
  await expect(targetRow).toBeVisible();

  const banDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    targetRow.getByRole("button", { name: "Benutzer sperren" }),
    banDialog,
  );
  await banDialog.getByLabel("Grund (optional)").fill("Regelverstoß");
  await banDialog.getByRole("button", { name: "Sperren" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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
   * itself sends them to the login, with the deep link (see
   * tests/deep-link-redirect.spec.ts)
   */
  await expect(page).toHaveURL("/?redirect-to=%2Fapp%2Fdashboard");
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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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

test("banning a user whom a different admin banned first shows the message and the ban", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "benutzer-verwalter",
    permissionStrings: USER_ADMIN_PERMISSIONS,
  });
  const otherAdmin = await createCitizen(prisma, {
    handle: "andere-verwalterin",
  });
  const target = await createCitizen(prisma, { handle: "zu-sperrender" });

  await signIn(admin.user);
  await page.goto("/app/iam/users");
  const targetRow = page.getByRole("row").filter({ hasText: target.user.id });
  const banDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    targetRow.getByRole("button", { name: "Benutzer sperren" }),
    banDialog,
  );

  await prisma.user.update({
    where: { id: target.user.id },
    data: { bannedAt: new Date(), bannedById: otherAdmin.entity.id },
  });
  await banDialog.getByRole("button", { name: "Sperren" }).click();

  await expect(
    page.getByText("Dieser Benutzer ist bereits gesperrt."),
  ).toBeVisible();
  // The refresh shows the ban of the other admin
  await expect(targetRow.getByText("Gesperrt")).toBeVisible();
  expect(
    await prisma.user.findUniqueOrThrow({
      where: { id: target.user.id },
      select: { bannedById: true },
    }),
  ).toEqual({ bannedById: otherAdmin.entity.id });
  expect(
    await prisma.auditEvent.count({ where: { type: "USER_BANNED" } }),
  ).toBe(0);
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
  await expect(targetRow).toBeVisible();

  const confirmDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    targetRow.getByRole("button", { name: "Bestätigen" }),
    confirmDialog,
  );
  await confirmDialog.getByRole("button", { name: "Bestätigen" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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

test("the users table shows and filters the Discord two-factor authentication of the last login", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "zwei-faktor-leser",
    permissionStrings: USER_ADMIN_PERMISSIONS,
  });
  const statuses = [
    {
      handle: "mit-2fa",
      discordTwoFactorEnabled: true,
      text: "Aktiv",
      filter: "enabled",
    },
    {
      handle: "ohne-2fa",
      discordTwoFactorEnabled: false,
      text: "Inaktiv",
      filter: "disabled",
    },
    {
      handle: "ungeprueft",
      discordTwoFactorEnabled: null,
      text: "Unbekannt",
      filter: "unknown",
    },
  ];
  const users = await Promise.all(
    statuses.map(async ({ handle, discordTwoFactorEnabled, text, filter }) => ({
      citizen: await createCitizen(prisma, { handle, discordTwoFactorEnabled }),
      text,
      filter,
    })),
  );
  const rowOf = (userId: string) =>
    page.getByRole("row").filter({ hasText: userId });

  await signIn(admin.user);
  await page.goto("/app/iam/users");

  for (const { citizen, text } of users) {
    await expect(
      rowOf(citizen.user.id).getByText(text, { exact: true }),
    ).toBeVisible();
  }

  // Each option of the filter keeps only the users with its status
  for (const { text, filter } of users) {
    await clickUntilUrl(
      page,
      toggleLabel(
        page.getByRole("radiogroup", { name: "Discord 2FA" }),
        new RegExp(`^${text}$`),
      ),
      new RegExp(`two_factor=${filter}`),
    );

    for (const { citizen, filter: otherFilter } of users) {
      const row = rowOf(citizen.user.id);
      if (otherFilter === filter) await expect(row).toBeVisible();
      else await expect(row).toHaveCount(0);
    }
  }
});
