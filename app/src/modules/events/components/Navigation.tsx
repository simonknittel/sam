import type { Entity, Event } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { SubNavigation } from "@/modules/common/components/SubNavigation";
import clsx from "clsx";
import { FaHome, FaUsers } from "react-icons/fa";
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
  const [showLineup, showFleetLink] = await Promise.all([
    isLineupVisible(event),
    authentication.authorize("orgFleet", "read"),
  ]);

  const pages = [
    {
      name: "Übersicht",
      icon: <FaHome />,
      path: `/app/events/${event.id}`,
    },
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
