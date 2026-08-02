"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { normalizeWikiEmbedUrl } from "@sam-monorepo/wiki-editor";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { validateWikiIframeSrc } from "../actions/validateWikiIframeSrc";

interface PreviousEmbedLayout {
  readonly provider: unknown;
  readonly widthPx: number | "full" | null;
  readonly heightPx: number | null;
  readonly align: "left" | "right" | null;
}

/**
 * Layout attributes of the embed node the insert is about to replace (the
 * edit menu selects the node before calling), so a URL update keeps the
 * node's size and alignment.
 */
const getReplacedEmbedLayout = (editor: Editor): PreviousEmbedLayout | null => {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return null;
  if (selection.node.type.name !== "wikiEmbed") return null;
  const attrs: Record<string, unknown> = selection.node.attrs;
  return {
    provider: attrs.provider,
    widthPx:
      typeof attrs.widthPx === "number" || attrs.widthPx === "full"
        ? attrs.widthPx
        : null,
    heightPx: typeof attrs.heightPx === "number" ? attrs.heightPx : null,
    align:
      attrs.align === "left" || attrs.align === "right" ? attrs.align : null,
  };
};

/**
 * Generic iframes size differently than the players (free height vs. fixed
 * height/aspect ratio), so the layout only carries over while the update
 * stays on the same side of that boundary.
 */
const withPreviousLayout = <T extends { readonly provider: string }>(
  attributes: T,
  previous: PreviousEmbedLayout | null,
): T => {
  if (!previous) return attributes;
  if ((previous.provider === "iframe") !== (attributes.provider === "iframe"))
    return attributes;
  return {
    ...attributes,
    widthPx: previous.widthPx,
    heightPx: previous.heightPx,
    align: previous.align,
  };
};

/**
 * Inserts an embed for the given URL at the current selection (replacing a
 * selected node). YouTube/Twitch/Spotify/Google URLs are recognized by
 * their fixed patterns and get their dedicated player; any other URL falls
 * back to a generic iframe, validated against the domain allowlist through
 * a server action. Shows a toast and returns false when rejected.
 */
export const insertWikiEmbedFromUrl = async (
  editor: Editor,
  url: string,
): Promise<boolean> => {
  const trimmed = url.trim();
  const previous = getReplacedEmbedLayout(editor);

  const normalized = normalizeWikiEmbedUrl(trimmed);
  if (normalized)
    return editor
      .chain()
      .focus()
      .setWikiEmbed(withPreviousLayout(normalized, previous))
      .run();

  const formData = new FormData();
  formData.set("src", trimmed);
  const allowed = await runAction(validateWikiIframeSrc, formData, {
    // The inserted embed itself is the feedback
    successToast: false,
    unknownErrorMessage:
      "Die URL konnte nicht geprüft werden. Bitte versuche es später erneut.",
  });
  if (!allowed) return false;

  return editor
    .chain()
    .focus()
    .setWikiEmbed(
      withPreviousLayout(
        { provider: "iframe" as const, src: trimmed },
        previous,
      ),
    )
    .run();
};
