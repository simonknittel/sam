"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import { groupByFeatured } from "@/modules/apps/utils/groupByFeatured";
import type { App, RedactedApp } from "@/modules/apps/utils/types";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Link } from "@/modules/common/components/Link";
import { FaHome } from "react-icons/fa";
import { MdTaskAlt, MdWorkspaces } from "react-icons/md";
import { TbMilitaryRank } from "react-icons/tb";
import { Footer } from "../Footer";
import { Account } from "./Account";
import { MobileActionBarFlyout } from "./MobileActionBarFlyout";
import { RedBar } from "./RedBar";

interface Props {
  readonly supportHref: string | null;
  /** Whether the viewer may read at least one career flow */
  readonly canReadCareer: boolean;
}

export const MobileActionBarClient = ({
  supportHref,
  canReadCareer,
}: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const { apps } = useAppsContext();
  if (!apps) return null;
  const { featured, other } = groupByFeatured(apps);

  const [canTasksRead, canFleetRead, canShipManage] = [
    authentication.authorize("task", "read"),
    authentication.authorize("orgFleet", "read"),
    authentication.authorize("ship", "manage"),
  ];

  const showTasks = canTasksRead;
  const showFleet = canFleetRead || canShipManage;
  const showCareer = canReadCareer;

  return (
    <ul className="flex h-full justify-evenly">
      <li className="h-full py-1">
        <Link
          href="/app"
          className="flex h-full flex-col items-center justify-center rounded-secondary px-4 active:bg-neutral-700"
        >
          <FaHome className="text-xl text-neutral-500" />
          <span className="text-xs">Dashboard</span>
        </Link>
      </li>

      {showTasks && (
        <li className="h-full py-1">
          <Link
            href="/app/tasks"
            className="flex h-full flex-col items-center justify-center rounded-secondary px-4 active:bg-neutral-700"
          >
            <MdTaskAlt className="text-xl text-neutral-500" />
            <span className="text-xs">Tasks</span>
          </Link>
        </li>
      )}

      {showFleet && (
        <li className="h-full py-1">
          <Link
            href="/app/fleet"
            className="flex h-full flex-col items-center justify-center rounded-secondary px-4 active:bg-neutral-700"
          >
            <MdWorkspaces className="text-xl text-neutral-500" />
            <span className="text-xs">Flotte</span>
          </Link>
        </li>
      )}

      {showCareer && (
        <li className="h-full py-1">
          <Link
            href="/app/career"
            className="flex h-full flex-col items-center justify-center rounded-secondary px-4 active:bg-neutral-700"
          >
            <TbMilitaryRank className="text-xl text-neutral-500" />
            <span className="text-xs">Karriere</span>
          </Link>
        </li>
      )}

      <li className="h-full py-1">
        <MobileActionBarFlyout>
          <Account supportHref={supportHref} />

          <div className="relative p-4" data-red-bar-container>
            {featured && (
              <div>
                <p className="pl-2 text-neutral-500">Featured</p>

                <ul className="mt-1">
                  {featured
                    .filter(
                      (app): app is Exclude<App, RedactedApp> =>
                        !("redacted" in app) || !app.redacted,
                    )
                    .map((app) => {
                      const href =
                        "href" in app ? app.href : `/app/external/${app.slug}`;

                      return (
                        <li key={app.name}>
                          <Link
                            href={href}
                            className="block rounded-secondary p-2 active:bg-neutral-700"
                          >
                            {app.name}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            {other && (
              <div className="mt-4">
                <p className="pl-2 text-neutral-500">Sonstige</p>

                <ul className="mt-2">
                  {other
                    .filter(
                      (app): app is Exclude<App, RedactedApp> =>
                        !("redacted" in app) || !app.redacted,
                    )
                    .map((app) => {
                      const href =
                        "href" in app ? app.href : `/app/external/${app.slug}`;

                      return (
                        <li key={app.name}>
                          <Link
                            href={href}
                            className="block rounded-secondary p-2 active:bg-neutral-700"
                          >
                            {app.name}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            <RedBar />
          </div>

          <Footer className="px-8 pt-0 pb-4" />
        </MobileActionBarFlyout>
      </li>
    </ul>
  );
};
