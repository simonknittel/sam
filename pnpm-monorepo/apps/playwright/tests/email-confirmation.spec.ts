import type { APIRequestContext, APIResponse } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/** The route accepts only lowercase letters and digits (`z.cuid2()`) */
const createToken = () => randomUUID().replaceAll("-", "");

const openConfirmationLink = (request: APIRequestContext, token: string) =>
  request.get("/api/confirm-email", { params: { token }, maxRedirects: 0 });

const expectRedirect = (response: APIResponse, pathname: string) => {
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location ?? "").pathname).toBe(pathname);
  /** The next page must not get the URL with the token as the referrer */
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
};

test("an email confirmation link verifies the email once and leads to the clearance page", async ({
  request,
  prisma,
}) => {
  const citizen = await createCitizen(prisma, { handle: "bestaetiger" });
  const otherCitizen = await createCitizen(prisma, {
    handle: "anderer-bestaetiger",
  });
  await prisma.user.updateMany({
    where: { id: { in: [citizen.user.id, otherCitizen.user.id] } },
    data: { emailVerified: null },
  });

  const expires = new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS);
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
  expect(
    await prisma.emailConfirmationToken.findMany({
      select: { userId: true },
    }),
  ).toEqual([{ userId: otherCitizen.user.id }]);

  expectRedirect(
    await openConfirmationLink(request, token),
    "/email-confirmation",
  );
  expectRedirect(
    await openConfirmationLink(request, olderToken),
    "/email-confirmation",
  );

  await expect
    .poll(() =>
      prisma.auditEvent.findMany({
        where: { type: "EMAIL_VERIFIED_VIA_TOKEN" },
        select: { createdById: true },
      }),
    )
    .toEqual([{ createdById: citizen.user.id }]);
});
