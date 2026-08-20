"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import { AppTile } from "@/modules/apps/components/AppTile";
import { AppTileGrid } from "@/modules/apps/components/AppTileGrid";
import { RedactedAppTile } from "@/modules/apps/components/RedactedAppTile";
import { groupByFeatured } from "@/modules/apps/utils/groupByFeatured";
import type { App, RedactedApp } from "@/modules/apps/utils/types";
import { Link } from "@/modules/common/components/Link";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import clsx from "clsx";
import { AiFillAppstore } from "react-icons/ai";

interface Props {
  readonly className?: string;
}

export const Apps = ({ className }: Props) => {
  const { apps, appDotBadgeCounts } = useAppsContext();
  if (!apps) return null;

  const hasDotBadge = Object.values(appDotBadgeCounts).some(
    (count) => count > 0,
  );

  return (
    <PopoverBaseUI
      trigger={
        <>
          <AiFillAppstore className="text-xl" />

          <span className="text-xs font-mono uppercase relative top-px leading-px">
            Apps
          </span>

          {hasDotBadge && <UnreadDot className="ml-1" />}
        </>
      }
      triggerClassName={clsx(
        "border-r border-neutral-700 rounded-l-primary hover:bg-tertiary cursor-pointer focus-visible:bg-tertiary px-6 inline-flex items-center gap-1 h-full text-neutral-500",
        className,
      )}
      childrenClassName="w-96"
    >
      <PopoverChildren apps={apps} appDotBadgeCounts={appDotBadgeCounts} />
    </PopoverBaseUI>
  );
};

interface PopoverChildrenProps {
  apps: App[];
  appDotBadgeCounts: Record<string, number>;
}

const PopoverChildren = ({ apps, appDotBadgeCounts }: PopoverChildrenProps) => {
  const { closePopover } = usePopoverBaseUI();

  const { featured, other } = groupByFeatured(apps);

  return (
    <>
      {featured && (
        <>
          <p className="font-bold text-sm text-center font-mono uppercase">
            Featured
          </p>

          <AppTileGrid variant="compact" className="mt-2">
            {featured.map((app) =>
              "redacted" in app && app.redacted ? (
                <RedactedAppTile key={app.name} variant="compact" />
              ) : (
                <AppTile
                  key={app.name}
                  app={app as Exclude<App, RedactedApp>}
                  variant="compact"
                  onClick={closePopover}
                  dotBadgeCount={
                    ("slug" in app && appDotBadgeCounts[app.slug]) || undefined
                  }
                />
              ),
            )}
          </AppTileGrid>
        </>
      )}

      {other && (
        <>
          <p className="font-bold text-sm text-center mt-4 font-mono uppercase">
            Weitere
          </p>

          <AppTileGrid variant="compact" className="mt-2">
            {other.map((app) =>
              "redacted" in app && app.redacted ? (
                <RedactedAppTile key={app.name} variant="compact" />
              ) : (
                <AppTile
                  key={app.name}
                  app={app as Exclude<App, RedactedApp>}
                  variant="compact"
                  onClick={closePopover}
                  dotBadgeCount={
                    ("slug" in app && appDotBadgeCounts[app.slug]) || undefined
                  }
                />
              ),
            )}
          </AppTileGrid>
        </>
      )}

      <div className="flex justify-center">
        <Link
          href="/app/apps"
          className="text-interaction-500 hover:underline focus-visible:underline text-sm p-4 -mb-4 font-mono uppercase"
          onClick={closePopover}
        >
          Alle Apps
        </Link>
      </div>
    </>
  );
};
