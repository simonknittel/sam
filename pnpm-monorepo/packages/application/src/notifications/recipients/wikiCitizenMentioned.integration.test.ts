import { prisma } from "@sam-monorepo/database";
import { WikiPageVisibility } from "@sam-monorepo/database/client";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findWikiCitizenMentionedRecipient } from "./wikiCitizenMentioned.js";

const createMention = async (authorId: string) => {
  const mentionedCitizen = await createCitizenWithPermissions("mentioned", [
    "login;manage",
  ]);

  return prisma.wikiPageCitizenMention.create({
    data: {
      page: {
        create: {
          title: "Mentioning page",
          slug: "mentioning-page",
          visibility: WikiPageVisibility.PUBLIC,
        },
      },
      citizen: { connect: { id: mentionedCitizen.id } },
      createdBy: { connect: { id: authorId } },
    },
  });
};

beforeEach(async () => {
  await truncateAllTables();
});

describe("findWikiCitizenMentionedRecipient", () => {
  test("names a deleted author with the label, not with the handle", async () => {
    const author = await prisma.citizen.create({
      data: { handle: "deleted-author", deletedAt: TEST_NOW },
    });
    const mention = await createMention(author.id);
    const { context } = createTestApplicationContext();

    const result = await findWikiCitizenMentionedRecipient(context, {
      mentionId: mention.id,
    });

    expect(result).toEqual({
      mention: {
        pageId: mention.pageId,
        pageTitle: "Mentioning page",
        eventId: null,
        mentionedByName: "Gelöschter Citizen",
      },
      recipients: [{ citizenId: mention.citizenId }],
    });
  });

  test("gives no recipient when the citizen cannot read the page at the delivery", async () => {
    const author = await prisma.citizen.create({ data: { handle: "author" } });
    const mention = await createMention(author.id);
    await prisma.wikiPage.update({
      where: { id: mention.pageId },
      data: { visibility: WikiPageVisibility.RESTRICTED },
    });
    const { context } = createTestApplicationContext();

    const result = await findWikiCitizenMentionedRecipient(context, {
      mentionId: mention.id,
    });

    expect(result?.recipients).toEqual([]);
  });
});
