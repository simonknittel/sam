import { requireAuthenticationPage } from "@/modules/auth/server";
import { SubNavigation } from "@/modules/common/components/SubNavigation";
import type { EventCitizenReference } from "@/modules/events/queries/eventRelationSelects";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { EventSource, type Event } from "@sam-monorepo/database/client";
import { getBriefingPath } from "@sam-monorepo/domain";
import clsx from "clsx";
import { FaBook, FaCog, FaHistory, FaHome, FaUsers } from "react-icons/fa";
import { MdWorkspaces } from "react-icons/md";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isLineupVisible } from "../utils/isLineupVisible";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly managers: EventCitizenReference[];
  };
}

export const Navigation = async ({ className, event }: Props) => {
  const authentication = await requireAuthenticationPage();
  const [showLineup, canReadFleet, eventWikiContext, showSettings] =
    await Promise.all([
      isLineupVisible(event),
      authentication.authorize("orgFleet", "read"),
      getEventWikiContext(toEventContainer(event.id)),
      event.source === EventSource.APP
        ? isAllowedToManageEvent(event)
        : Promise.resolve(false),
    ]);

  /**
   * The gate: only events seeded with a root page have a briefing, and the
   * root page's read scope decides who gets the tab.
   */
  const showBriefing = Boolean(
    eventWikiContext?.rootPage &&
    eventWikiContext.permissions.get(eventWikiContext.rootPage.id)?.canRead,
  );

  /** The pages of the participants exist only while the participation is on */
  const showParticipants = event.participationEnabled;
  const showFleetLink = canReadFleet && event.participationEnabled;

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
            path: getBriefingPath(toEventContainer(event.id)),
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
    ...(showParticipants
      ? [
          {
            name: "Teilnehmer",
            icon: <FaUsers />,
            path: `/app/events/${event.id}/participants`,
          },
        ]
      : []),
    ...(event.source === EventSource.APP
      ? [
          {
            name: "Aktivität",
            icon: <FaHistory />,
            path: `/app/events/${event.id}/activity`,
          },
        ]
      : []),
    ...(showFleetLink
      ? [
          {
            name: "Flotte",
            icon: <MdWorkspaces />,
            path: `/app/events/${event.id}/fleet`,
          },
        ]
      : []),
    ...(showSettings
      ? [
          {
            name: "Einstellungen",
            icon: <FaCog />,
            path: `/app/events/${event.id}/settings`,
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
