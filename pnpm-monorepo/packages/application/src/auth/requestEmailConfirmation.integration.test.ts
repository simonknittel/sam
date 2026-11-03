import { isCuid } from "@paralleldrive/cuid2";
import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { EmailTemplate } from "../context.js";
import { requestEmailConfirmation } from "./requestEmailConfirmation.js";

/** The link in the email is valid for one day */
const TOKEN_LIFETIME_MILLISECONDS = 24 * 60 * 60 * 1000;

const EMAIL = "pilot@example.com";

beforeEach(async () => {
  await truncateAllTables();
});

test("saves a token and requests the email with the link", async () => {
  const user = await prisma.user.create({ data: { email: EMAIL } });
  const { context, emailRequests, auditEvents } =
    createTestApplicationContext();

  await expect(
    requestEmailConfirmation(context, createTestActor({ userId: user.id })),
  ).resolves.toEqual({ email_sent: true });

  const storedToken = await prisma.emailConfirmationToken.findFirstOrThrow({
    where: { userId: user.id },
  });
  expect(isCuid(storedToken.token)).toBe(true);
  expect(storedToken).toMatchObject({
    email: EMAIL,
    expires: new Date(TEST_NOW.getTime() + TOKEN_LIFETIME_MILLISECONDS),
  });
  expect(emailRequests).toEqual([
    {
      template: EmailTemplate.EmailConfirmation,
      messages: [
        {
          to: EMAIL,
          templateProps: {
            baseUrl: "https://sam.example.com",
            host: "sam.example.com",
            token: storedToken.token,
          },
        },
      ],
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.EMAIL_CONFIRMATION_REQUESTED,
      data: { userId: user.id, email: EMAIL },
      createdById: user.id,
    },
  ]);
});

test("writes no audit event when the email cannot go out", async () => {
  const user = await prisma.user.create({ data: { email: EMAIL } });
  const { context, auditEvents } = createTestApplicationContext({
    email: {
      request: async () => {
        throw new Error("EventBridge is not available");
      },
    },
  });

  await expect(
    requestEmailConfirmation(context, createTestActor({ userId: user.id })),
  ).resolves.toEqual({ email_sent: false });
  expect(auditEvents).toEqual([]);
});
