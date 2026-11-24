"use client";

import { api } from "@/trpc/react";
import type { WikiCitizen } from "@sam-monorepo/application";
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
import { withWikiRoleCitizensNodeView } from "./WikiRoleCitizensNodeView";
import { WikiSlashCommand } from "./WikiSlashCommand";
import { withWikiVariantLinkNodeView } from "./WikiVariantLinkNodeView";

interface Options {
  readonly pageId: string;
  readonly iframeAllowlist: readonly string[];
  readonly linkedPages: WikiLinkedPages;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
  readonly pageIndexes: Readonly<Record<string, WikiPageIndexEntry[]>>;
  readonly roleCitizens: Readonly<Record<string, WikiCitizen[]>>;
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
  readonly collaboration?: boolean;
  /** Include the editing helpers (slash menu, suggestions, uploads)? */
  readonly interactive: boolean;
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  readonly onRequestEmbed: () => void;
  readonly onRequestLink: () => void;
  readonly onRequestVariantLink: () => void;
}

/**
 * The schema extensions come from the shared package. The `with…` variants
 * change only the rendering in the editor: the same name, attributes and
 * schema, so save validation, the collab server and the static renderer stay
 * untouched. The editing helpers add no schema.
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
