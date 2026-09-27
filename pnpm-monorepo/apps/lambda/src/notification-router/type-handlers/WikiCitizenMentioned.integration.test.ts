import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../../test/database";
import { publishNotifications } from "../publish";
import { WikiCitizenMentionedHandler } from "./WikiCitizenMentioned";

vi.mock("../publish", () => ({ publishNotifications: vi.fn() }));

beforeEach(async () => {
  await truncateAllTables();
  vi.mocked(publishNotifications).mockClear();
});

describe("WikiCitizenMentionedHandler", () => {
  test("names a deleted author with the label, not with the handle", async () => {
    const mentionedCitizen = await prisma.citizen.create({
      data: { handle: "mentioned" },
    });
    const author = await prisma.citizen.create({
      data: { handle: "deleted-author", deletedAt: new Date() },
    });
    const mention = await prisma.wikiPageCitizenMention.create({
      data: {
        page: { create: { title: "Mentioning page", slug: "mentioning-page" } },
        citizen: { connect: { id: mentionedCitizen.id } },
        createdBy: { connect: { id: author.id } },
      },
    });

    await WikiCitizenMentionedHandler({ mentionId: mention.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        receiverId: mentionedCitizen.id,
        payload: expect.objectContaining({
          mentionedByHandle: "Gelöschter Citizen",
        }),
        body: 'Gelöschter Citizen hat dich auf der Seite "Mentioning page" erwähnt',
      }),
    ]);
  });
});
