import type { Page } from "@playwright/test";
import { createCitizen } from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

const HEADING = "Zwei-Faktor-Authentifizierung erforderlich";

/** A query of `protectedProcedure`: the tRPC gate of the clearance */
const requestSpynetSearch = (page: Page) =>
  page.request.get("/api/trpc/spynet.search", {
    params: new URLSearchParams({
      input: JSON.stringify({ json: { query: "falke" } }),
    }),
  });

test("a citizen with a sensitive permission needs the two-factor authentication of Discord", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "ohne-2fa",
    permissionStrings: ["systemLog;read", "citizen;read"],
    discordTwoFactorEnabled: false,
  });
  await signIn(citizen.user);

  for (const route of ["/app/dashboard", "/app/system-log"]) {
    await page.goto(route);
    await expect(page, `${route} must stop at the gate`).toHaveURL(
      "/two-factor-authentication",
    );
  }
  await expect(page.getByRole("heading", { name: HEADING })).toBeVisible();
  await expect(
    page.getByText("Bei deiner letzten Anmeldung hat Discord gemeldet"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Erneut mit Discord anmelden" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
  expect((await requestSpynetSearch(page)).status()).toBe(403);

  // The next Discord login writes the status
  await prisma.user.update({
    where: { id: citizen.user.id },
    data: { discordTwoFactorEnabled: true },
  });

  await page.goto("/two-factor-authentication");
  await expect(page).toHaveURL("/app/dashboard");
  expect((await requestSpynetSearch(page)).status()).toBe(200);
});

test("an admin without a known two-factor authentication stops at the gate and gets no admin tools", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "admin-ohne-2fa",
    admin: true,
    discordTwoFactorEnabled: null,
  });
  await signIn(admin.user);

  await page.goto("/app/dashboard");

  await expect(page).toHaveURL("/two-factor-authentication");
  await expect(
    page.getByText("Wir haben die Zwei-Faktor-Authentifizierung"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Admin tools/ })).toHaveCount(
    0,
  );
  const assumableUsers = await page.request.get(
    "/api/trpc/users.getAssumableUsers",
  );
  expect(assumableUsers.status()).toBe(403);
});

test("a citizen without a sensitive permission needs no two-factor authentication", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "normal-ohne-2fa",
    permissionStrings: ["event;manage", "citizen;read"],
    discordTwoFactorEnabled: false,
  });
  await signIn(citizen.user);

  await page.goto("/two-factor-authentication");

  await expect(page).toHaveURL("/app/dashboard");
  await expect(page.getByRole("heading", { name: HEADING })).toHaveCount(0);
  expect((await requestSpynetSearch(page)).status()).toBe(200);
});
