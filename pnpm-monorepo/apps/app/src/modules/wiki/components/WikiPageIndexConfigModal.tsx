"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { api } from "@/modules/common/utils/api";
import {
  WIKI_PAGE_INDEX_MAX_DEPTH,
  WIKI_PAGE_INDEX_MAX_TAGS,
  normalizeWikiPageIndexConfig,
  type WikiPageIndexMatchMode,
  type WikiPageIndexMode,
} from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { useId, useState } from "react";
import { FaSave, FaTag } from "react-icons/fa";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly editor: Editor;
  /** Document position of the node being configured */
  readonly position: number;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly onRequestClose: () => void;
}

/**
 * Configuration dialog for a page-index node ("Seitenverzeichnis"), opened
 * from the edit menu: page tree (root page + depth) or tag query (tag set +
 * AND/OR). Saving writes the node's attributes — the rendered list follows
 * via the node view's server fetch.
 */
export const WikiPageIndexConfigModal = ({
  editor,
  position,
  attrs,
  onRequestClose,
}: Props) => {
  /**
   * Scopes tag and page pickers to the event wiki on briefing pages, and
   * the page picker to the subtree inside variant embeds (tags stay global
   * there — the WIKI namespace has one shared tag scope)
   */
  const { eventId, variantId } = useWikiPageHrefMode();
  const depthInputId = useId();
  const initial = normalizeWikiPageIndexConfig(attrs);

  const [mode, setMode] = useState<string>(initial.mode);
  const [rootPageId, setRootPageId] = useState(initial.rootPageId ?? "");
  const [maxDepth, setMaxDepth] = useState(
    initial.maxDepth === null ? "" : String(initial.maxDepth),
  );
  const [tagIds, setTagIds] = useState<readonly string[]>(initial.tagIds);
  const [matchMode, setMatchMode] = useState<string>(initial.matchMode);

  const { data: existingTags } = api.wiki.getTags.useQuery(
    { eventId: eventId ?? undefined },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  /**
   * Readable pages in tree order for the root picker — permission-filtered
   * server-side, so invisible titles can never leak.
   */
  const { data: pageTargets } = api.wiki.getPageTargets.useQuery(
    {
      permission: "read",
      eventId: eventId ?? undefined,
      variantId: variantId ?? undefined,
    },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const toggleTag = (tagId: string) => {
    setTagIds((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : previous.length < WIKI_PAGE_INDEX_MAX_TAGS
          ? [...previous, tagId]
          : previous,
    );
  };

  const save = () => {
    /**
     * Guard against stale positions after collab edits — the node must
     * still be a page index.
     */
    const node = editor.state.doc.nodeAt(position);
    if (node?.type.name === "wikiPageIndex") {
      const config = normalizeWikiPageIndexConfig({
        mode,
        rootPageId: rootPageId || null,
        maxDepth: maxDepth === "" ? null : Number(maxDepth),
        tagIds: [...tagIds],
        matchMode,
      });
      editor
        .chain()
        .command(({ tr }) => {
          tr.setNodeAttribute(position, "mode", config.mode);
          tr.setNodeAttribute(position, "rootPageId", config.rootPageId);
          tr.setNodeAttribute(position, "maxDepth", config.maxDepth);
          tr.setNodeAttribute(position, "tagIds", [...config.tagIds]);
          tr.setNodeAttribute(position, "matchMode", config.matchMode);
          return true;
        })
        .run();
    }
    onRequestClose();
  };

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Seitenverzeichnis konfigurieren</h2>}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <RadioGroup
          name="mode"
          value={mode}
          onChange={setMode}
          items={[
            {
              value: "tree" satisfies WikiPageIndexMode,
              label: "Seitenbaum",
              hint: "Listet die Unterseiten einer Seite — auch solche, die in der Seitenleiste ausgeblendet sind.",
            },
            {
              value: "tags" satisfies WikiPageIndexMode,
              label: "Tags",
              hint: "Listet alle Seiten mit bestimmten Tags.",
            },
          ]}
        />

        {mode === ("tree" satisfies WikiPageIndexMode) && (
          <>
            <label className="mt-4 mb-1 block">Übergeordnete Seite</label>
            <WikiPageSelect
              name="rootPageId"
              value={rootPageId}
              onChange={(event) => setRootPageId(event.target.value)}
              targets={pageTargets ?? []}
              emptyOptionLabel="Diese Seite"
            />

            <label className="mt-4 mb-1 block" htmlFor={depthInputId}>
              Tiefe der Unterseiten (leer = alle Ebenen)
            </label>
            <input
              id={depthInputId}
              type="number"
              min={1}
              max={WIKI_PAGE_INDEX_MAX_DEPTH}
              value={maxDepth}
              onChange={(event) => setMaxDepth(event.target.value)}
              placeholder="Alle"
              className="w-full rounded-secondary border border-neutral-700 bg-transparent px-3 h-9 text-sm focus-visible:border-neutral-500 focus-visible:outline-none"
            />
          </>
        )}

        {mode === ("tags" satisfies WikiPageIndexMode) && (
          <>
            <p className="mt-4 mb-1">Tags</p>
            {existingTags && existingTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {existingTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={tagIds.includes(tag.id)}
                    className={
                      tagIds.includes(tag.id)
                        ? "flex items-center gap-1 rounded-secondary bg-interaction-700 py-1 px-2 text-sm text-white hover:bg-interaction-500 focus-visible:bg-interaction-500"
                        : "flex items-center gap-1 rounded-secondary bg-neutral-700/50 py-1 px-2 text-sm text-neutral-300 hover:bg-neutral-700 focus-visible:bg-neutral-700"
                    }
                  >
                    <FaTag className="size-3 flex-none" />
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                Es existieren noch keine Tags.
              </p>
            )}

            <div className="mt-4">
              <RadioGroup
                name="matchMode"
                value={matchMode}
                onChange={setMatchMode}
                items={[
                  {
                    value: "all" satisfies WikiPageIndexMatchMode,
                    label: "Alle Tags",
                    hint: "Eine Seite muss alle ausgewählten Tags haben (UND).",
                  },
                  {
                    value: "any" satisfies WikiPageIndexMatchMode,
                    label: "Beliebige Tags",
                    hint: "Eine Seite muss mindestens einen der ausgewählten Tags haben (ODER).",
                  },
                ]}
              />
            </div>
          </>
        )}

        <Button2 type="submit" className="mt-4 ml-auto">
          <FaSave />
          Übernehmen
        </Button2>
      </form>
    </Modal>
  );
};
