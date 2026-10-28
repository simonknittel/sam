"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import { groupByFeatured } from "@/modules/apps/utils/groupByFeatured";
import type { App, RedactedApp } from "@/modules/apps/utils/types";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Link } from "@/modules/common/components/Link";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FaBookOpen, FaHome } from "react-icons/fa";
import { MdEvent, MdTaskAlt } from "react-icons/md";
import { Footer } from "../Footer";
import { Account } from "./Account";
import { BarItemContent, barItemClassName } from "./BarItemContent";
import { Create } from "./Create";
import { MobileActionBarFlyout } from "./MobileActionBarFlyout";
import { Notifications } from "./Notifications";

type LinkedApp = Exclude<App, RedactedApp>;

interface Props {
  readonly supportHref: string | null;
}

export const MobileActionBarClient = ({ supportHref }: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const { apps, appDotBadgeCounts } = useAppsContext();
  const pathname = usePathname();
  if (!apps) return null;
  const { featured, other } = groupByFeatured(apps);
  const currentApp = findCurrentApp(apps.filter(isLinkedApp), pathname);
  const hasAppDotBadge = Object.values(appDotBadgeCounts).some(
    (count) => count > 0,
  );

  const showEvents = authentication.authorize("event", "read");
  const showTasks = authentication.authorize("task", "read");

  const renderAppLinks = (sectionApps: App[]) =>
    sectionApps.filter(isLinkedApp).map((app) => (
      <li key={app.name}>
        <AppLink
          app={app}
          isCurrent={app === currentApp}
          pathname={pathname}
          hasUnreadDot={Boolean(appDotBadgeCounts[app.slug])}
        />
      </li>
    ));

  return (
    <ul className="flex h-full px-1">
      <BarLink href="/app" icon={<FaHome />} label="Dashboard" />

      {showEvents && (
        <BarLink href="/app/events" icon={<MdEvent />} label="Events" />
      )}

      {showTasks && (
        <BarLink href="/app/tasks" icon={<MdTaskAlt />} label="Tasks" />
      )}

      <BarLink href="/app/wiki" icon={<FaBookOpen />} label="Wiki" />

      <li className="h-full min-w-fit flex-1 py-1">
        <Notifications />
      </li>

      <li className="h-full min-w-fit flex-1 py-1">
        <MobileActionBarFlyout hasUnreadDot={hasAppDotBadge}>
          <Account supportHref={supportHref} />

          <div className="p-4">
            <Create />

            {featured && (
              <div className="mt-4">
                <p className="pl-2 text-neutral-500">Featured</p>

                <ul className="mt-1">{renderAppLinks(featured)}</ul>
              </div>
            )}

            {other && (
              <div className="mt-4">
                <p className="pl-2 text-neutral-500">Sonstige</p>

                <ul className="mt-2">{renderAppLinks(other)}</ul>
              </div>
            )}
          </div>

          <Footer className="px-8 pt-0 pb-4" />
        </MobileActionBarFlyout>
      </li>
    </ul>
  );
};

interface BarLinkProps {
  readonly href: string;
  readonly icon: ReactNode;
  readonly label: string;
}

const BarLink = ({ href, icon, label }: BarLinkProps) => {
  return (
    <li className="h-full min-w-fit flex-1 py-1">
      <Link href={href} className={barItemClassName}>
        <BarItemContent icon={icon} label={label} />
      </Link>
    </li>
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
  readonly pathname: string;
  /** Whether the app has new items */
  readonly hasUnreadDot: boolean;
}

const AppLink = ({ app, isCurrent, pathname, hasUnreadDot }: AppLinkProps) => {
  const href = getAppHref(app);
  /**
   * "page" only on the start page of the app. On a different page of the
   * app, the link marks the current section of the navigation.
   */
  const ariaCurrent = pathname === href ? "page" : "true";

  return (
    <Link
      href={href}
      aria-current={isCurrent ? ariaCurrent : undefined}
      className={clsx(
        "relative flex items-center gap-1.5 rounded-secondary p-2 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-secondary hover:bg-neutral-700 focus-visible:bg-neutral-700 active:bg-neutral-600",
        { "before:bg-interaction-500": isCurrent },
      )}
    >
      {app.name}

      {hasUnreadDot && <UnreadDot />}
    </Link>
  );
};
