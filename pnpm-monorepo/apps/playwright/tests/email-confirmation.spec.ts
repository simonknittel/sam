import type { APIRequestContext, APIResponse } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/** The route accepts only lowercase letters and digits (`z.cuid2()`) */
const createToken = () => randomUUID().replaceAll("-", "");

/** The test reads the redirect instead of following it */
const openConfirmationLink = (request: APIRequestContext, token: string) =>
  request.get("/api/confirm-email", { params: { token }, maxRedirects: 0 });

const expectRedirect = (response: APIResponse, pathname: string) => {
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location ?? "").pathname).toBe(pathname);
};

test("an email confirmation link verifies the email once and leads to the clearance page", async ({
  request,
  prisma,
}) => {
  const citizen = await createCitizen(prisma, { handle: "bestaetiger" });
  const otherCitizen = await createCitizen(prisma, {
    handle: "anderer-bestaetiger",
  });
  /** The factory confirms the email for the sake of the sign-in */
  await prisma.user.updateMany({
    where: { id: { in: [citizen.user.id, otherCitizen.user.id] } },
    data: { emailVerified: null },
  });

  const expires = new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS);
  /** The user asked for a second link, thus an older token also exists */
  const olderToken = createToken();
  const token = createToken();
  await prisma.emailConfirmationToken.createMany({
    data: [olderToken, token].map((value) => ({
      token: value,
      email: citizen.user.email ?? "",
      userId: citizen.user.id,
      expires,
    })),
  });
  await prisma.emailConfirmationToken.create({
    data: {
      token: createToken(),
      email: otherCitizen.user.email ?? "",
      userId: otherCitizen.user.id,
      expires,
    },
  });

  expectRedirect(await openConfirmationLink(request, token), "/clearance");

  const users = await prisma.user.findMany({
    where: { id: { in: [citizen.user.id, otherCitizen.user.id] } },
    select: { id: true, emailVerified: true },
  });
  expect(users).toEqual(
    expect.arrayContaining([
      { id: citizen.user.id, emailVerified: expect.any(Date) },
      { id: otherCitizen.user.id, emailVerified: null },
    ]),
  );
  /** All tokens of the user are used up, the tokens of others stay */
  expect(
    await prisma.emailConfirmationToken.findMany({
      select: { userId: true },
    }),
  ).toEqual([{ userId: otherCitizen.user.id }]);

  /** A used token and the older token lead back to the request of a link */
  expectRedirect(
    await openConfirmationLink(request, token),
    "/email-confirmation",
  );
  expectRedirect(
    await openConfirmationLink(request, olderToken),
    "/email-confirmation",
  );

  expect(
    await prisma.auditEvent.findMany({
      where: { type: "EMAIL_VERIFIED_VIA_TOKEN" },
      select: { createdById: true },
    }),
  ).toEqual([{ createdById: citizen.user.id }]);
});
