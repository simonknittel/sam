"use client";

import { useIsOwnCitizen } from "@/modules/auth/hooks/useIsOwnCitizen";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { CitizenAvatarSize } from "@/modules/common/components/CitizenAvatarSize";
import { CitizenLinkAvatar } from "@/modules/common/components/CitizenLinkAvatar";
import type { ResolvedWikiCitizenMention } from "@sam-monorepo/wiki-editor/helpers";

interface Props {
  readonly resolved: ResolvedWikiCitizenMention | null;
}

/**
 * The rendered mention: the citizen hover popover (roles, Spynet link)
 * around a link to the citizen's spynet page. Shared between the static
 * render for readers and the editor node view (WikiCitizenMentionNodeView)
 * so both look and behave the same. Loads no editor code.
 */
export const WikiCitizenMentionChip = ({ resolved }: Props) => {
  const isOwnCitizen = useIsOwnCitizen(
    resolved && !resolved.deleted ? resolved.citizenId : undefined,
  );

  if (!resolved)
    return (
      <span data-wiki-citizen-mention="" data-unavailable="">
        @Unbekannt
      </span>
    );

  if (resolved.deleted)
    return (
      <span data-wiki-citizen-mention="" data-deleted="">
        @{resolved.label}
      </span>
    );

  return (
    <CitizenPopover citizenId={resolved.citizenId}>
      <a
        data-wiki-citizen-mention={resolved.citizenId}
        data-own-citizen={isOwnCitizen ? "" : undefined}
        href={`/app/spynet/citizen/${encodeURIComponent(resolved.citizenId)}`}
      >
        <CitizenLinkAvatar
          citizenId={resolved.citizenId}
          size={CitizenAvatarSize.Text}
        />
        @{resolved.label}
      </a>
    </CitizenPopover>
  );
};
