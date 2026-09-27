import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../../test/database";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithLeveledRole,
  MAXIMUM_LEVEL,
} from "../../common/effectivePermissions.fixtures";
import { publishNotifications } from "../publish";
import { WikiPageReportedHandler } from "./WikiPageReported";

vi.mock("../publish", () => ({ publishNotifications: vi.fn() }));

const PERMISSION_STRINGS = ["wiki;manage"];

const createReport = () =>
  prisma.wikiPageReport.create({
    data: {
      page: { create: { title: "Reported page", slug: "reported-page" } },
      message: "Test",
    },
  });

beforeEach(async () => {
  await truncateAllTables();
  vi.mocked(publishNotifications).mockClear();
});

describe("WikiPageReportedHandler", () => {
  test("notifies a citizen with the permission only through an inherited role", async () => {
    const citizen = await createCitizenWithInheritedPermissions(
      "inherited",
      PERMISSION_STRINGS,
    );
    const report = await createReport();

    await WikiPageReportedHandler({ reportId: report.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        receiverId: citizen.id,
        notificationType: "wiki_page_reported",
      }),
    ]);
  });

  test("notifies only the citizen at the maximum level of the role", async () => {
    const atMaximumLevel = await createCitizenWithLeveledRole(
      "at-maximum-level",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL,
    );
    await createCitizenWithLeveledRole(
      "below-maximum-level",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL - 1,
    );
    const report = await createReport();

    await WikiPageReportedHandler({ reportId: report.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ receiverId: atMaximumLevel.id }),
    ]);
  });
});
