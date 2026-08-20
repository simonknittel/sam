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
      title="Apps"
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
      /**
       * The max height is a safety net for short viewports only — at normal
       * sizes the popover is shorter than the space Base UI reports.
       */
      childrenClassName="w-[30rem] max-h-[var(--available-height)] overflow-y-auto"
    >
      <PopoverChildren />
    </PopoverBaseUI>
  );
};

const PopoverChildren = () => {
  const { closePopover } = usePopoverBaseUI();
  const { apps, appDotBadgeCounts, favoriteAppKeys } = useAppsContext();

  const { favorites, featured, other } = groupByFeatured(apps, favoriteAppKeys);
  const hasFavorites = Boolean(favorites && favorites.length > 0);

  return (
    <>
      {favorites && hasFavorites && (
        <AppsSection
          title="Favoriten"
          apps={favorites}
          appDotBadgeCounts={appDotBadgeCounts}
          onNavigate={closePopover}
        />
      )}

      {featured && (
        <AppsSection
          title="Featured"
          apps={featured}
          appDotBadgeCounts={appDotBadgeCounts}
          onNavigate={closePopover}
          className={clsx({ "mt-4": hasFavorites })}
        />
      )}

      {other && (
        <AppsSection
          title="Weitere"
          apps={other}
          appDotBadgeCounts={appDotBadgeCounts}
          onNavigate={closePopover}
          className="mt-4"
        />
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

interface AppsSectionProps {
  readonly className?: string;
  readonly title: string;
  readonly apps: App[];
  readonly appDotBadgeCounts: Record<string, number>;
  readonly onNavigate: () => void;
}

const AppsSection = ({
  className,
  title,
  apps,
  appDotBadgeCounts,
  onNavigate,
}: AppsSectionProps) => {
  return (
    <div className={className}>
      <p className="font-bold text-sm text-center font-mono uppercase">
        {title}
      </p>

      <AppTileGrid variant="compact" className="mt-2">
        {apps.map((app) =>
          "redacted" in app && app.redacted ? (
            <RedactedAppTile key={app.name} name={app.name} variant="compact" />
          ) : (
            <AppTile
              key={app.name}
              app={app as Exclude<App, RedactedApp>}
              variant="compact"
              onClick={onNavigate}
              dotBadgeCount={
                ("slug" in app && appDotBadgeCounts[app.slug]) || undefined
              }
            />
          ),
        )}
      </AppTileGrid>
    </div>
  );
};
