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

export const MobileActionBarClient = () => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const { apps } = useAppsContext();
  if (!apps) return null;
  const { featured, other } = groupByFeatured(apps);

  const [
    canTasksRead,
    canFleetRead,
    canShipManage,
    canCareerReadSecurity,
    canCareerReadEconomic,
    canCareerReadManagement,
    canCareerReadTeam,
  ] = [
    authentication.authorize("task", "read"),
    authentication.authorize("orgFleet", "read"),
    authentication.authorize("ship", "manage"),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "security",
      },
    ]),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "economic",
      },
    ]),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "management",
      },
    ]),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "team",
      },
    ]),
  ];

  const showTasks = canTasksRead;
  const showFleet = canFleetRead || canShipManage;
  const showCareer =
    canCareerReadSecurity ||
    canCareerReadEconomic ||
    canCareerReadManagement ||
    canCareerReadTeam;

  return (
    <ul className="h-full flex justify-evenly">
      <li className="h-full py-1">
        <Link
          href="/app"
          className="flex flex-col items-center justify-center px-4 h-full active:bg-neutral-700 rounded-secondary"
        >
          <FaHome className="text-xl text-neutral-500" />
          <span className="text-xs">Dashboard</span>
        </Link>
      </li>

      {showTasks && (
        <li className="h-full py-1">
          <Link
            href="/app/tasks"
            className="flex flex-col items-center justify-center px-4 h-full active:bg-neutral-700 rounded-secondary"
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
            className="flex flex-col items-center justify-center px-4 h-full active:bg-neutral-700 rounded-secondary"
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
            className="flex flex-col items-center justify-center px-4 h-full active:bg-neutral-700 rounded-secondary"
          >
            <TbMilitaryRank className="text-xl text-neutral-500" />
            <span className="text-xs">Karriere</span>
          </Link>
        </li>
      )}

      <li className="h-full py-1">
        <MobileActionBarFlyout>
          <Account />

          <div className="p-4 relative" data-red-bar-container>
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
                            className="block p-2 active:bg-neutral-700 rounded-secondary"
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
                            className="block p-2 active:bg-neutral-700 rounded-secondary"
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

          <Footer className="px-8 pb-4 pt-0" />
        </MobileActionBarFlyout>
      </li>
    </ul>
  );
};
