"use client";

import { api } from "@/trpc/react";
import {
  getWikiEditorExtensions,
  type WikiLinkedPages,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import { getWikiTwitchParentHost } from "../utils/getWikiTwitchParentHost";
import type { WikiImageDimensions } from "../utils/wikiImageRendering";
import { WikiActiveNodeHighlight } from "./WikiActiveNodeHighlight";
import { withWikiAttachmentReportButton } from "./WikiAttachmentNodeView";
import { WikiBlockClick } from "./WikiBlockClick";
import { withWikiCitizenMentionPopover } from "./WikiCitizenMentionNodeView";
import { WikiCitizenMentionSuggestion } from "./WikiCitizenMentionSuggestion";
import { WikiDetailsSummaryToggle } from "./WikiDetailsSummaryToggle";
import { createWikiFileHandler } from "./wikiEditorFiles";
import { WikiHiddenTrailingParagraph } from "./WikiHiddenTrailingParagraph";
import { withWikiImageOptimization } from "./WikiImageNodeView";
import {
  useWikiLinkablePagesInput,
  WIKI_LINKABLE_PAGES_STALE_TIME_MS,
} from "./wikiLinkablePages";
import { WikiNodeClickSelection } from "./WikiNodeClickSelection";
import type { WikiPageIndexEntry } from "./WikiPageIndexList";
import { withWikiPageIndexNodeView } from "./WikiPageIndexNodeView";
import { withWikiPageLinkNodeView } from "./WikiPageLinkNodeView";
import { WikiPageLinkSuggestion } from "./WikiPageLinkSuggestion";
import type { WikiRoleCitizen } from "./WikiRoleCitizensList";
import { withWikiRoleCitizensNodeView } from "./WikiRoleCitizensNodeView";
import { WikiSlashCommand } from "./WikiSlashCommand";
import { withWikiVariantLinkNodeView } from "./WikiVariantLinkNodeView";

interface Options {
  readonly pageId: string;
  readonly iframeAllowlist: readonly string[];
  /**
   * The pages the content linked to when the page rendered, by id — the
   * node views and the "[[" suggestion load the others on demand
   */
  readonly linkedPages: WikiLinkedPages;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  /** Current names and manufacturer logos of the variants linked on the page, by id */
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
  /**
   * Server-resolved page lists of the page-index nodes, keyed by
   * `wikiPageIndexConfigKey` — the node views' initial data
   */
  readonly pageIndexes: Readonly<Record<string, WikiPageIndexEntry[]>>;
  /**
   * Server-resolved members of the role-member nodes, keyed by role id —
   * the node views' initial data
   */
  readonly roleCitizens: Readonly<Record<string, WikiRoleCitizen[]>>;
  /**
   * Intrinsic dimensions of the page's uploaded images, by upload id —
   * lets the image node view serve optimized images
   */
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
  readonly collaboration?: boolean;
  /** Include the editing helpers (slash menu, suggestions, uploads)? */
  readonly interactive: boolean;
  /** Whether the viewer may upload images to the page */
  readonly canUploadImages: boolean;
  /** Whether the viewer may upload file attachments to the page */
  readonly canUploadAttachments: boolean;
  /** Opens the embed URL dialog (palette entry "Einbetten") */
  readonly onRequestEmbed: () => void;
  /** Opens the link dialog (palette entry "Link") */
  readonly onRequestLink: () => void;
  /** Opens the ship picker (palette entry "Schiff") */
  readonly onRequestVariantLink: () => void;
}

/**
 * Extension list of the collaborative editor: the schema extensions from
 * the shared package plus the app-side editing helpers for users who can
 * edit.
 */
export const useWikiEditorExtensions = ({
  pageId,
  iframeAllowlist,
  linkedPages,
  mentionedCitizens,
  linkedVariants,
  pageIndexes,
  roleCitizens,
  imageDimensions,
  collaboration = false,
  interactive,
  canUploadImages,
  canUploadAttachments,
  onRequestEmbed,
  onRequestLink,
  onRequestVariantLink,
}: Options): AnyExtension[] => {
  const trpcUtils = api.useUtils();
  const linkablePagesInput = useWikiLinkablePagesInput();

  const baseExtensions = withWikiImageOptimization(
    withWikiPageIndexNodeView(
      withWikiRoleCitizensNodeView(
        withWikiVariantLinkNodeView(
          withWikiCitizenMentionPopover(
            withWikiPageLinkNodeView(
              getWikiEditorExtensions({
                collaboration,
                twitchParentHost: getWikiTwitchParentHost(),
                iframeAllowlist,
                pages: linkedPages,
                citizens: mentionedCitizens,
                variants: linkedVariants,
              }),
            ),
          ),
        ),
        roleCitizens,
      ),
      pageId,
      pageIndexes,
    ),
    imageDimensions,
  );

  return [
    /**
     * While editing, the plain attachment node keeps its native
     * drag/selection behavior — the report button is a read-view affordance.
     */
    ...(interactive
      ? baseExtensions
      : withWikiAttachmentReportButton(baseExtensions, pageId)),
    WikiDetailsSummaryToggle,
    ...(interactive
      ? [
          WikiSlashCommand.configure({
            pageId,
            canUploadImages,
            canUploadAttachments,
            onRequestEmbed,
            onRequestLink,
            onRequestVariantLink,
          }),
          WikiPageLinkSuggestion.configure({
            fetchPages: () =>
              trpcUtils.wiki.getLinkablePages.fetch(linkablePagesInput, {
                staleTime: WIKI_LINKABLE_PAGES_STALE_TIME_MS,
              }),
          }),
          WikiCitizenMentionSuggestion.configure({
            fetchCitizens: () => trpcUtils.citizens.getAllCitizens.ensureData(),
          }),
          WikiBlockClick,
          WikiNodeClickSelection,
          WikiActiveNodeHighlight,
          createWikiFileHandler(pageId, {
            canUploadImages,
            canUploadAttachments,
          }),
        ]
      : [WikiHiddenTrailingParagraph]),
  ];
};
