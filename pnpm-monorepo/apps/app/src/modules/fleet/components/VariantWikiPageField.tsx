"use client";

import { WikiPageSelect } from "@/modules/wiki/components/WikiPageSelect";
import { api } from "@/trpc/react";
import { useId } from "react";

interface Props {
  readonly currentWikiPageId?: string | null;
  /** Keeps the skeleton while the caller still loads the current value */
  readonly loading?: boolean;
}

/**
 * Wiki page selector of the create/update variant modals. Offers every page
 * the configuring user can read; the selected page and its subtree get
 * embedded on the variant's detail page.
 */
export const VariantWikiPageField = ({ currentWikiPageId, loading }: Props) => {
  const selectId = useId();
  const targets = api.wiki.getPageTargets.useQuery(
    { permission: "read" },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  /**
   * A linked page the configuring user cannot read is missing from the
   * targets. Keeping it selectable under a placeholder title makes sure
   * saving unrelated fields never silently unlinks it.
   */
  const unreadableCurrentTarget =
    currentWikiPageId &&
    targets.data &&
    !targets.data.some((target) => target.id === currentWikiPageId)
      ? {
          id: currentWikiPageId,
          title: "Aktuell verknüpfte Seite (für dich nicht sichtbar)",
          depth: 0,
        }
      : null;
  const selectableTargets = unreadableCurrentTarget
    ? [unreadableCurrentTarget, ...(targets.data ?? [])]
    : (targets.data ?? []);

  return (
    <>
      <label className="mt-6 block" htmlFor={selectId}>
        Wiki-Seite
      </label>
      {loading || targets.isFetching ? (
        <div className="rounded-secondary bg-neutral-900 mt-2 h-10 animate-pulse" />
      ) : (
        <WikiPageSelect
          id={selectId}
          name="wikiPageId"
          className="mt-2"
          targets={selectableTargets}
          emptyOptionLabel="Keine Wiki-Seite"
          defaultValue={currentWikiPageId ?? ""}
        />
      )}
      <small className="text-white/40">
        optional – die Seite wird mit ihrem Unterbaum auf der Variantenseite
        eingebettet
      </small>
    </>
  );
};
