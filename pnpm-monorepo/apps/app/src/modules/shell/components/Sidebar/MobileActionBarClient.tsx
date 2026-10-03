"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import { groupByFeatured } from "@/modules/apps/utils/groupByFeatured";
import type { App, RedactedApp } from "@/modules/apps/utils/types";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Link } from "@/modules/common/components/Link";
import { usePathname } from "next/navigation";
import { FaHome } from "react-icons/fa";
import { MdTaskAlt, MdWorkspaces } from "react-icons/md";
import { TbMilitaryRank } from "react-icons/tb";
import { Footer } from "../Footer";
import { Account } from "./Account";
import { MobileActionBarFlyout } from "./MobileActionBarFlyout";

type LinkedApp = Exclude<App, RedactedApp>;

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
  const pathname = usePathname();
  if (!apps) return null;
  const { featured, other } = groupByFeatured(apps);
  const currentApp = findCurrentApp(apps.filter(isLinkedApp), pathname);

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

          <div className="p-4">
            {featured && (
              <div>
                <p className="pl-2 text-neutral-500">Featured</p>

                <ul className="mt-1">
                  {featured.filter(isLinkedApp).map((app) => (
                    <li key={app.name}>
                      <AppLink app={app} isCurrent={app === currentApp} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {other && (
              <div className="mt-4">
                <p className="pl-2 text-neutral-500">Sonstige</p>

                <ul className="mt-2">
                  {other.filter(isLinkedApp).map((app) => (
                    <li key={app.name}>
                      <AppLink app={app} isCurrent={app === currentApp} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Footer className="px-8 pt-0 pb-4" />
        </MobileActionBarFlyout>
      </li>
    </ul>
  );
};

const isLinkedApp = (app: App): app is LinkedApp =>
  !("redacted" in app) || !app.redacted;

const getAppHref = (app: LinkedApp) =>
  "href" in app ? app.href : `/app/external/${app.slug}`;

/**
 * The current app has the longest address that is a prefix of the pathname,
 * thus a subpage also marks its app.
 */
const findCurrentApp = (apps: readonly LinkedApp[], pathname: string) =>
  apps
    .filter((app) => pathname.startsWith(getAppHref(app)))
    .toSorted(
      (first, second) => getAppHref(second).length - getAppHref(first).length,
    )
    .at(0);

interface AppLinkProps {
  readonly app: LinkedApp;
  readonly isCurrent: boolean;
}

const AppLink = ({ app, isCurrent }: AppLinkProps) => {
  return (
    <Link
      href={getAppHref(app)}
      aria-current={isCurrent ? "page" : undefined}
      className="relative block rounded-secondary p-2 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-secondary active:bg-neutral-700 aria-[current=page]:before:bg-interaction-500"
    >
      {app.name}
    </Link>
  );
};
