import { requireAuthentication } from "@/modules/auth/server";
import { SubNavigation } from "@/modules/common/components/SubNavigation";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { getEventWikiBasePath } from "@/modules/wiki/utils/wikiPageHref";
import type { Entity, Event } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { FaBook, FaHome, FaUsers } from "react-icons/fa";
import { MdWorkspaces } from "react-icons/md";
import { isLineupVisible } from "../utils/isLineupVisible";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly managers: Entity[];
  };
}

export const Navigation = async ({ className, event }: Props) => {
  const authentication = await requireAuthentication();
  const [showLineup, showFleetLink, eventWikiContext] = await Promise.all([
    isLineupVisible(event),
    authentication.authorize("orgFleet", "read"),
    getEventWikiContext(event.id),
  ]);

  /**
   * The gate: only events seeded with a root page have a briefing, and the
   * root page's read scope decides who gets the tab.
   */
  const showBriefing = Boolean(
    eventWikiContext?.rootPage &&
    eventWikiContext.permissions.get(eventWikiContext.rootPage.id)?.canRead,
  );

  const pages = [
    {
      name: "Übersicht",
      icon: <FaHome />,
      path: `/app/events/${event.id}`,
    },
    ...(showBriefing
      ? [
          {
            name: "Briefing",
            icon: <FaBook />,
            path: getEventWikiBasePath(event.id),
            matchesSubpaths: true,
          },
        ]
      : []),
    ...(showLineup
      ? [
          {
            name: "Aufstellung",
            icon: <MdWorkspaces />,
            path: `/app/events/${event.id}/lineup`,
          },
        ]
      : []),
    {
      name: "Teilnehmer",
      icon: <FaUsers />,
      path: `/app/events/${event.id}/participants`,
    },
    ...(showFleetLink
      ? [
          {
            name: "Flotte",
            icon: <MdWorkspaces />,
            path: `/app/events/${event.id}/fleet`,
          },
        ]
      : []),
  ];

  return (
    <SubNavigation
      pages={pages}
      className={clsx("flex flex-wrap", className)}
    />
  );
};
