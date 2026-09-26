import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
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
  if (!resolved)
    return (
      <span data-wiki-citizen-mention="" data-unavailable="">
        @Unbekannt
      </span>
    );

  return (
    <CitizenPopover citizenId={resolved.citizenId}>
      <a
        data-wiki-citizen-mention={resolved.citizenId}
        href={`/app/spynet/citizen/${encodeURIComponent(resolved.citizenId)}`}
      >
        @{resolved.label}
      </a>
    </CitizenPopover>
  );
};
