import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

/**
 * The app shell loads this one time for each request and gives it to the
 * browser, thus a citizen link can show the avatar without its own query.
 *
 * Each viewer of the app gets all avatars, also without `citizen;read`: the URL
 * holds the Discord id, but each user is a member of the Discord server, where
 * the other members see the avatar and the Discord id.
 */
export const listCitizenAvatarUrls = async (
  context: ApplicationContext,
): Promise<ReadonlyMap<string, string>> => {
  const citizens = await context.prisma.citizen.findMany({
    where: { ...ACTIVE_CITIZEN_WHERE, user: { image: { not: null } } },
    select: { id: true, user: { select: { image: true } } },
  });

  return new Map(
    citizens.flatMap((citizen) =>
      citizen.user?.image ? [[citizen.id, citizen.user.image] as const] : [],
    ),
  );
};
