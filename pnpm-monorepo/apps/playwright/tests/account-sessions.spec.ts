import type { PrismaClient, User } from "@sam-monorepo/database/client";
import { randomUUID } from "node:crypto";
import { createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  DELETED_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const CHROME_ON_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const createSession = (
  prisma: PrismaClient,
  user: Pick<User, "id">,
  { expires, userAgent }: { expires: Date; userAgent?: string },
) =>
  prisma.session.create({
    data: {
      sessionToken: `token-${randomUUID()}`,
      userId: user.id,
      expires,
      createdAt: new Date(Date.now() - ONE_DAY_MS),
      userAgent,
    },
  });

/**
 * The signIn fixture writes the session it authenticates with directly, so
 * the only way to tell it apart is that it is not one of the seeded ones.
 */
const findCurrentSession = async (
  prisma: PrismaClient,
  user: Pick<User, "id">,
  seededSessionIds: string[],
) => {
  const [session, ...rest] = await prisma.session.findMany({
    where: { userId: user.id, id: { notIn: seededSessionIds } },
  });
  expect(session).toBeDefined();
  expect(rest).toHaveLength(0);
  return session!;
};

test("the list shows every session and the filters narrow it", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "sitzungs-inhaber" });
  const otherDevice = await createSession(prisma, citizen.user, {
    expires: new Date(Date.now() + ONE_DAY_MS),
    userAgent: CHROME_ON_WINDOWS,
  });
  const expiredDevice = await createSession(prisma, citizen.user, {
    expires: new Date(Date.now() - ONE_DAY_MS),
  });

  await signIn(citizen.user);
  const currentSession = await findCurrentSession(prisma, citizen.user, [
    otherDevice.id,
    expiredDevice.id,
  ]);

  await page.goto("/app/account/sessions");

  // The current session is marked, its user agent is unknown because the
  // fixture writes the row without going through the NextAuth adapter
  const currentRow = page
    .getByRole("row")
    .filter({ hasText: currentSession.id });
  await expect(currentRow).toBeVisible();
  await expect(currentRow.getByText("Aktuell")).toBeVisible();
  await expect(currentRow.getByText("Unbekannt").first()).toBeVisible();

  // The other device shows its parsed user agent
  const otherRow = page.getByRole("row").filter({ hasText: otherDevice.id });
  await expect(otherRow).toBeVisible();
  await expect(otherRow.getByText("Chrome 141 · Windows 10")).toBeVisible();

  // The session token is never rendered
  await expect(page.getByText(otherDevice.sessionToken)).toHaveCount(0);

  // The status filter defaults to active, so the expired session is hidden
  await expect(
    page.getByRole("row").filter({ hasText: expiredDevice.id }),
  ).toHaveCount(0);

  await page.goto("/app/account/sessions?status=expired");
  await expect(
    page.getByRole("row").filter({ hasText: expiredDevice.id }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: otherDevice.id }),
  ).toHaveCount(0);
});

test("deleting a session logs that device out", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "sitzungs-aufraeumer",
  });
  const otherDevice = await createSession(prisma, citizen.user, {
    expires: new Date(Date.now() + ONE_DAY_MS),
    userAgent: CHROME_ON_WINDOWS,
  });

  await signIn(citizen.user);
  await page.goto("/app/account/sessions");

  const otherRow = page.getByRole("row").filter({ hasText: otherDevice.id });
  await clickUntilVisible(
    otherRow.getByRole("button", { name: "Sitzung löschen" }),
    page.getByRole("alertdialog"),
  );
  await expect(page.getByText("Sitzung löschen?")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(otherRow).toHaveCount(0);

  await expect
    .poll(() => prisma.session.count({ where: { id: otherDevice.id } }))
    .toBe(0);
  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "USER_SESSION_DELETED" },
  });
  expect(auditEvent).not.toBeNull();
});

test("the current session cannot be deleted from the list", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "sitzungs-bewahrer" });

  await signIn(citizen.user);
  const currentSession = await findCurrentSession(prisma, citizen.user, []);

  await page.goto("/app/account/sessions");

  const currentRow = page
    .getByRole("row")
    .filter({ hasText: currentSession.id });
  await expect(
    currentRow.getByRole("button", { name: "Löschen" }),
  ).toBeDisabled();
});

test("another user's sessions are not listed", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "sitzungs-neugieriger",
  });
  const stranger = await createCitizen(prisma, { handle: "sitzungs-fremder" });
  const strangerDevice = await createSession(prisma, stranger.user, {
    expires: new Date(Date.now() + ONE_DAY_MS),
    userAgent: CHROME_ON_WINDOWS,
  });

  await signIn(citizen.user);
  await page.goto("/app/account/sessions");

  await expect(
    page.getByRole("row").filter({ hasText: strangerDevice.id }),
  ).toHaveCount(0);
});
