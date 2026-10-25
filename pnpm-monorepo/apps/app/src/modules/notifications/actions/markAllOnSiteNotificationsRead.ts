"use server";

import { createUseCaseAction } from "@/modules/application";
import { markAllOnSiteNotificationsRead as markAllOnSiteNotificationsReadUseCase } from "@sam-monorepo/application";

export const markAllOnSiteNotificationsRead = createUseCaseAction({
  name: "markAllOnSiteNotificationsRead",
  useCase: markAllOnSiteNotificationsReadUseCase,
  // The announced items lost their "new" state in the lists, tiles and dot badges
  refresh: (output) => output.new_items_read,
  success: () => "Alle als gelesen markiert",
});
