import type { Page } from "@playwright/test";
import type { Citizen, PrismaClient } from "@sam-monorepo/database/client";
import { assignRole, createCitizen, ONE_DAY_MS } from "../fixtures/factories";
import { clickUntilVisible, themeRoot } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

enum GreetingBanner {
  Welcome = "data-welcome-banner",
  Birthday = "data-birthday-banner",
  Seasonal = "data-seasonal-banner",
}

const greetingBanner = (page: Page, occasion: GreetingBanner) =>
  page.getByRole("main").locator(`[${occasion}]`);

const expectOnlyBanner = async (page: Page, expected: GreetingBanner) => {
  await expect(greetingBanner(page, expected)).toBeVisible();

  for (const occasion of Object.values(GreetingBanner)) {
    if (occasion === expected) continue;

    await expect(greetingBanner(page, occasion)).toHaveCount(0);
  }
};

/**
 * A missing banner proves nothing before the dashboard of the viewer is there.
 * The name of the heading also contains the copy button and a hint for screen
 * readers, thus the handle is only a part of it.
 */
const profileHeading = (page: Page, handle: string) =>
  page.getByRole("main").getByRole("heading", { name: handle });

const readWelcomedAt = async (
  prisma: PrismaClient,
  citizen: Pick<Citizen, "id">,
) =>
  (
    await prisma.citizen.findUniqueOrThrow({
      where: { id: citizen.id },
      select: { welcomedAt: true },
    })
  ).welcomedAt;

const countWelcomeAuditEvents = (prisma: PrismaClient) =>
  prisma.auditEvent.count({ where: { type: "CITIZEN_WELCOMED" } });

interface CitizenInUtcOptions {
  readonly handle: string;
  readonly welcomedAt?: Date | null;
  /** Only the day and the month count. */
  readonly birthday?: Date;
}

/**
 * In the time zone UTC, the welcome day and the birthday follow the UTC date of
 * the test, at each time of day.
 */
const createCitizenInUtc = async (
  prisma: PrismaClient,
  { handle, welcomedAt, birthday }: CitizenInUtcOptions,
) => {
  const citizen = await createCitizen(prisma, { handle, welcomedAt });

  await prisma.citizen.update({
    where: { id: citizen.entity.id },
    data: {
      timezone: "UTC",
      birthdayDay: birthday ? birthday.getUTCDate() : null,
      birthdayMonth: birthday ? birthday.getUTCMonth() + 1 : null,
    },
  });

  return citizen;
};

/** A greeting day of the seasonal themes, see seasonal-themes.spec.ts */
const HALLOWEEN_GREETING_DATE = "2026-10-31";

/** The preview of the admin toolbar, see setGreetingBannerPreview */
const GREETING_BANNER_PREVIEW_COOKIE = "greeting-banner-preview";

test("a new member gets the welcome banner on the first visit of the dashboard", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "neuling",
    welcomedAt: null,
  });
  await signIn(citizen.user);

  await page.goto("/app/dashboard");
  await expectOnlyBanner(page, GreetingBanner.Welcome);
  await expect(
    greetingBanner(page, GreetingBanner.Welcome).getByRole("button", {
      name: "Lerne das SAM kennen",
    }),
  ).toBeVisible();

  const welcomedAt = await readWelcomedAt(prisma, citizen.entity);
  expect(welcomedAt).not.toBeNull();

  await page.reload();
  await expect(greetingBanner(page, GreetingBanner.Welcome)).toBeVisible();
  expect(await readWelcomedAt(prisma, citizen.entity)).toEqual(welcomedAt);
  // The audit event follows after the response
  await expect.poll(() => countWelcomeAuditEvents(prisma)).toBe(1);
});

test("the welcome banner is gone on the day after the welcome", async ({
  page,
  prisma,
  signIn,
}) => {
  // In UTC, 24 hours before now is always on the day before
  const citizen = await createCitizenInUtc(prisma, {
    handle: "gestern-begruesst",
    welcomedAt: new Date(Date.now() - ONE_DAY_MS),
  });
  await signIn(citizen.user);

  await page.goto("/app/dashboard");
  await expect(profileHeading(page, "gestern-begruesst")).toBeVisible();
  await expect(greetingBanner(page, GreetingBanner.Welcome)).toHaveCount(0);
  await expect(greetingBanner(page, GreetingBanner.Birthday)).toHaveCount(0);
});

test("a citizen without the login permission is not welcomed until they get it", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "ohne-freigabe",
    welcomedAt: null,
  });
  await prisma.roleAssignment.deleteMany({
    where: { citizenId: citizen.entity.id },
  });
  await signIn(citizen.user);

  await page.goto("/app/dashboard");
  await expect(
    page.getByText("Bitte melde dich bei Human Resources"),
  ).toBeVisible();
  await expect(page).toHaveURL("/clearance");
  expect(await readWelcomedAt(prisma, citizen.entity)).toBeNull();
  expect(await countWelcomeAuditEvents(prisma)).toBe(0);

  await assignRole(prisma, citizen.entity, citizen.role);

  await page.goto("/app/dashboard");
  await expect(greetingBanner(page, GreetingBanner.Welcome)).toBeVisible();
  expect(await readWelcomedAt(prisma, citizen.entity)).not.toBeNull();
});

test("the birthday banner greets the citizen on their birthday only", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const now = new Date();
  const birthdayChild = await createCitizenInUtc(prisma, {
    handle: "geburtstagskind",
    birthday: now,
  });
  const otherCitizen = await createCitizenInUtc(prisma, {
    handle: "anderer-geburtstag",
    birthday: new Date(now.getTime() + 30 * ONE_DAY_MS),
  });

  await signIn(birthdayChild.user);
  await page.goto("/app/dashboard");
  await expect(greetingBanner(page, GreetingBanner.Birthday)).toBeVisible();
  await expect(greetingBanner(page, GreetingBanner.Welcome)).toHaveCount(0);

  await switchUser(otherCitizen.user);
  await page.goto("/app/dashboard");
  await expect(profileHeading(page, "anderer-geburtstag")).toBeVisible();
  await expect(greetingBanner(page, GreetingBanner.Birthday)).toHaveCount(0);
});

interface PriorityCase {
  readonly title: string;
  readonly handle: string;
  readonly isNewMember: boolean;
  readonly hasBirthdayToday: boolean;
  readonly expected: GreetingBanner;
}

const PRIORITY_CASES: readonly PriorityCase[] = [
  {
    title: "the welcome wins over the birthday",
    handle: "neuling-mit-geburtstag",
    isNewMember: true,
    hasBirthdayToday: true,
    expected: GreetingBanner.Welcome,
  },
  {
    title: "the birthday wins over the seasonal greeting",
    handle: "mitglied-mit-geburtstag",
    isNewMember: false,
    hasBirthdayToday: true,
    expected: GreetingBanner.Birthday,
  },
  {
    title: "the seasonal greeting shows without a different occasion",
    handle: "mitglied-ohne-anlass",
    isNewMember: false,
    hasBirthdayToday: false,
    expected: GreetingBanner.Seasonal,
  },
];

for (const priorityCase of PRIORITY_CASES) {
  test(`on a seasonal greeting day, ${priorityCase.title}`, async ({
    page,
    prisma,
    signIn,
    setSeasonalDate,
  }) => {
    const citizen = await createCitizenInUtc(prisma, {
      handle: priorityCase.handle,
      welcomedAt: priorityCase.isNewMember ? null : undefined,
      birthday: priorityCase.hasBirthdayToday ? new Date() : undefined,
    });
    await signIn(citizen.user);
    await setSeasonalDate(HALLOWEEN_GREETING_DATE);

    await page.goto("/app/dashboard");
    await expectOnlyBanner(page, priorityCase.expected);
    await expect(themeRoot(page)).toHaveAttribute(
      "data-seasonal-event",
      "halloween",
    );
  });
}

test("an admin previews the welcome banner through the admin toolbar", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "vorschau-admin",
    admin: true,
  });
  await signIn(admin.user);

  await page.goto("/app/dashboard");
  await expect(profileHeading(page, "vorschau-admin")).toBeVisible();
  await expect(greetingBanner(page, GreetingBanner.Welcome)).toHaveCount(0);

  const toolbarPanel = page.getByRole("dialog", { name: "Admin tools" });
  await clickUntilVisible(
    page.getByRole("button", { name: /^Admin tools/ }),
    toolbarPanel,
  );
  await toolbarPanel
    .getByLabel("Greeting banner preview")
    .selectOption({ label: "Welcome" });

  await expectOnlyBanner(page, GreetingBanner.Welcome);
});

test("the preview cookie shows the birthday banner on a day without a birthday", async ({
  page,
  context,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "vorschau-betrachter",
  });
  await signIn(citizen.user);
  await context.addCookies([
    {
      name: GREETING_BANNER_PREVIEW_COOKIE,
      value: "birthday",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/app/dashboard");
  await expectOnlyBanner(page, GreetingBanner.Birthday);
});
