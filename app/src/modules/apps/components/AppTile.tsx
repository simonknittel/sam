import { Badge } from "@/modules/common/components/Badge";
import clsx from "clsx";
import Image from "next/image";
import NextLink from "next/link";
import { FaExternalLinkAlt } from "react-icons/fa";
import type { App, RedactedApp } from "../utils/types";

interface Props {
  readonly className?: string;
  readonly app: Exclude<App, RedactedApp>;
  readonly variant?: "default" | "compact";
  readonly onClick?: () => void;
}

export const AppTile = ({
  className,
  app,
  variant = "default",
  onClick,
}: Props) => {
  const href =
    "href" in app
      ? app.href
      : "defaultPage" in app && "externalUrl" in app.defaultPage
        ? app.defaultPage.externalUrl
        : `/app/external/${app.slug}`;

  const isExternal = "defaultPage" in app && "externalUrl" in app.defaultPage;

  if (variant === "compact") {
    return (
      <NextLink
        href={href}
        className={clsx(
          "flex items-center justify-between gap-2 hover:outline-interaction-700 focus-visible:outline-interaction-700 active:outline-interaction-500 outline outline-offset-4 outline-1 outline-transparent transition-colors rounded-primary overflow-hidden background-secondary group p-2 text-xs",
          className,
        )}
        onClick={onClick}
      >
        <span title={app.name} className="flex-1 truncate">
          {app.name}
        </span>
        {isExternal && (
          <FaExternalLinkAlt className="flex-none text-neutral-500" />
        )}
      </NextLink>
    );
  }

  return (
    <NextLink
      href={href}
      className={clsx(
        "flex flex-col hover:outline-interaction-700 focus-visible:outline-interaction-700 active:outline-interaction-500 outline outline-offset-4 outline-1 outline-transparent transition-colors rounded-primary overflow-hidden background-secondary group",
        className,
      )}
    >
      {app.imageSrc ? (
        <Image
          src={app.imageSrc}
          alt={`Screenshot der ${app.name} App`}
          priority
          className="aspect-video object-cover object-top grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0 transition flex-initial"
        />
      ) : (
        <div className="aspect-video bg-black" />
      )}

      <div className="p-2 sm:p-4 flex flex-col gap-2 flex-1">
        <div className="flex gap-2 items-center">
          <h2 title={app.name} className="font-bold truncate">
            {app.name}
          </h2>
          {isExternal && (
            <FaExternalLinkAlt className="flex-none text-neutral-500 text-sm" />
          )}
        </div>

        {"description" in app && app.description && (
          <p className="text-xs text-neutral-400 flex-1">{app.description}</p>
        )}

        {app.tags?.length && (
          <div className="flex flex-wrap gap-[2px]">
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
    </NextLink>
  );
};
