"use client";

import { useAppsContext } from "@/modules/apps/components/AppsContext";
import { AppTile } from "@/modules/apps/components/AppTile";
import { AppTileGrid } from "@/modules/apps/components/AppTileGrid";
import { RedactedAppTile } from "@/modules/apps/components/RedactedAppTile";
import { groupByFeatured } from "@/modules/apps/utils/groupByFeatured";
import type { App, RedactedApp } from "@/modules/apps/utils/types";
import { Link } from "@/modules/common/components/Link";
import { Popover, usePopover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { AiFillAppstore } from "react-icons/ai";

interface Props {
  readonly className?: string;
}

export const Apps = ({ className }: Props) => {
  const { apps } = useAppsContext();
  if (!apps) return null;

  return (
    <Popover
      trigger={
        <button
          className={clsx(
            "border-r border-neutral-700 rounded-l-primary hover:background-tertiary focus-visible:background-tertiary px-6 inline-flex items-center gap-1 h-full text-neutral-500",
            className,
          )}
        >
          <AiFillAppstore className="text-xl" />
          <span className="text-xs font-mono uppercase relative top-[1px]">
            Apps
          </span>
        </button>
      }
      enableHover
      childrenClassName="w-96"
    >
      <PopoverChildren apps={apps} />
    </Popover>
  );
};

interface PopoverChildrenProps {
  apps: App[];
}

const PopoverChildren = ({ apps }: PopoverChildrenProps) => {
  const { closePopover } = usePopover();

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
