"use client";

import { useCitizenAvatarUrl } from "@/modules/citizen/components/CitizenAvatarsProvider";
import {
  DiscordAvatarMotion,
  getDiscordAvatarSource,
} from "@/modules/discord/utils/getDiscordAvatarSource";
import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";
import { FaUser } from "react-icons/fa";
import { CitizenAvatarSize } from "./CitizenAvatarSize";

/**
 * The largest `CitizenAvatarSize` (`List`), the Discord image has twice this
 * size
 */
const LARGEST_CSS_SIZE = 32;

interface Props {
  readonly citizenId: string;
  readonly size: CitizenAvatarSize;
}

/**
 * An inline box in the line of the name, thus an ellipsis of the link or of its
 * parent still cuts a long name. The name is the accessible name of the link,
 * thus the image has no alt text.
 */
export const CitizenLinkAvatar = ({ citizenId, size }: Props) => {
  const avatarUrl = useCitizenAvatarUrl(citizenId);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string>();

  if (size === CitizenAvatarSize.None) return null;

  const className = clsx("inline-block shrink-0 rounded", {
    "mr-[0.3em] size-[1.25em] align-[-0.25em]": size === CitizenAvatarSize.Text,
    "mr-1.5 size-6 align-middle": size === CitizenAvatarSize.Row,
    "mr-2 size-8 align-middle": size === CitizenAvatarSize.List,
  });

  const source =
    avatarUrl && avatarUrl !== failedAvatarUrl
      ? getDiscordAvatarSource(
          avatarUrl,
          LARGEST_CSS_SIZE,
          DiscordAvatarMotion.Still,
        )
      : null;

  if (!source)
    return (
      <span
        className={clsx(className, "relative bg-neutral-700 text-neutral-400")}
        aria-hidden
      >
        {/* Out of the flow, thus the box has the baseline of an image */}
        <FaUser className="absolute inset-0 m-auto size-[55%]" />
      </span>
    );

  return (
    <Image
      src={source}
      alt=""
      width={LARGEST_CSS_SIZE}
      height={LARGEST_CSS_SIZE}
      unoptimized
      loading="lazy"
      className={clsx(className, "object-cover")}
      data-citizen-avatar=""
      onError={() => setFailedAvatarUrl(avatarUrl)}
    />
  );
};
