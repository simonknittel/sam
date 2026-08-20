import { Badge } from "@/modules/common/components/Badge";
import { Link } from "@/modules/common/components/Link";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import clsx from "clsx";
import Image from "next/image";
import { FaExternalLinkAlt, FaInfoCircle } from "react-icons/fa";
import { getAppKey } from "../utils/getAppKey";
import type { App, RedactedApp } from "../utils/types";
import { AppFavoriteButton } from "./AppFavoriteButton";

interface Props {
  readonly className?: string;
  readonly app: Exclude<App, RedactedApp>;
  readonly variant?: "default" | "compact";
  readonly onClick?: () => void;
  readonly dotBadgeCount?: number;
}

/**
 * The tile is a container rather than one big anchor: the star and the about
 * link are interactive in their own right and can't be nested inside it. The
 * navigation link is stretched across the whole tile with a pseudo-element
 * instead, with the two controls stacked above it.
 */
export const AppTile = ({
  className,
  app,
  variant = "default",
  onClick,
  dotBadgeCount = 0,
}: Props) => {
  const href =
    "href" in app
      ? app.href
      : "defaultPage" in app && "externalUrl" in app.defaultPage
        ? app.defaultPage.externalUrl
        : `/app/external/${app.slug}`;

  const isExternal = "defaultPage" in app && "externalUrl" in app.defaultPage;
  const aboutHref =
    "defaultPage" in app ? `/app/external/${app.slug}/about` : undefined;
  const appKey = getAppKey(app);

  const containerClassName =
    "relative group/app-tile bg-secondary rounded-primary outline outline-transparent outline-offset-4 transition-colors motion-reduce:transition-none hover:outline-interaction-700 focus-within:outline-interaction-700 active:outline-interaction-500";

  if (variant === "compact") {
    return (
      <div
        className={clsx(
          containerClassName,
          "flex items-center gap-2 p-2 text-xs",
          className,
        )}
      >
        <Link
          href={href}
          className="flex-1 truncate outline-hidden after:absolute after:inset-0"
          title={app.name}
          onClick={onClick}
        >
          {app.name}
        </Link>

        <div className="relative flex flex-none items-center gap-1.5 text-sm">
          {dotBadgeCount > 0 && <UnreadDot />}

          {aboutHref && (
            <Link
              href={aboutHref}
              className="flex-none text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 transition-colors motion-reduce:transition-none"
              title="Über diese App"
              aria-label="Über diese App"
              onClick={onClick}
            >
              <FaInfoCircle />
            </Link>
          )}

          {isExternal && (
            <FaExternalLinkAlt className="flex-none text-neutral-500 text-xs" />
          )}

          {appKey && <AppFavoriteButton appKey={appKey} revealOnHover />}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(containerClassName, "flex flex-col", className)}>
      <div className="overflow-hidden rounded-t-primary">
        {app.imageSrc ? (
          <Image
            src={app.imageSrc}
            alt={`Screenshot der ${app.name} App`}
            priority
            className="aspect-video object-cover object-top grayscale group-hover/app-tile:grayscale-0 group-focus-within/app-tile:grayscale-0 transition motion-reduce:transition-none flex-initial"
          />
        ) : (
          <div className="aspect-video bg-black" />
        )}
      </div>

      <div className="p-2 sm:p-4 flex flex-col gap-2 flex-1">
        <div className="flex gap-2 items-center">
          <h2
            title={app.name}
            className="font-bold truncate font-mono uppercase"
          >
            <Link
              href={href}
              className="outline-hidden after:absolute after:inset-0"
            >
              {app.name}
            </Link>
          </h2>

          <div className="relative flex flex-none items-center gap-1.5 ml-auto text-sm">
            {dotBadgeCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-interaction-700 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-interaction-500" />
              </span>
            )}

            {aboutHref && (
              <Link
                href={aboutHref}
                className="flex-none text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 transition-colors motion-reduce:transition-none"
                title="Über diese App"
                aria-label="Über diese App"
              >
                <FaInfoCircle />
              </Link>
            )}

            {isExternal && (
              <FaExternalLinkAlt className="flex-none text-neutral-500" />
            )}

            {appKey && <AppFavoriteButton appKey={appKey} />}
          </div>
        </div>

        {"description" in app && app.description && (
          <p className="text-xs text-neutral-400 flex-1">{app.description}</p>
        )}

        {app.tags?.length && (
          <div className="flex flex-wrap gap-0.5">
            {app.tags.map((tag) => (
              <Badge
                key={tag}
                label="Tag"
                value={tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : tag}
                className="text-xs"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
