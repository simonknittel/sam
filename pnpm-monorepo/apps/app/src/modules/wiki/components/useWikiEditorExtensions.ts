"use client";

import { api } from "@/trpc/react";
import {
  getWikiEditorExtensions,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import { getWikiTwitchParentHost } from "../utils/getWikiTwitchParentHost";
import { WikiActiveNodeHighlight } from "./WikiActiveNodeHighlight";
import { withWikiAttachmentReportButton } from "./WikiAttachmentCard";
import { withWikiCitizenMentionPopover } from "./WikiCitizenMentionNodeView";
import { WikiCitizenMentionSuggestion } from "./WikiCitizenMentionSuggestion";
import { WikiDetailsSummaryToggle } from "./WikiDetailsSummaryToggle";
import { createWikiFileHandler } from "./wikiEditorFiles";
import { WikiNodeClickSelection } from "./WikiNodeClickSelection";
import { withWikiPageIndexNodeView } from "./WikiPageIndexNodeView";
import { WikiPageLinkSuggestion } from "./WikiPageLinkSuggestion";
import { withWikiRoleCitizensNodeView } from "./WikiRoleCitizensNodeView";
import { WikiSlashCommand } from "./WikiSlashCommand";

interface Options {
  readonly pageId: string;
  readonly iframeAllowlist: readonly string[];
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  readonly collaboration?: boolean;
  /** Include the editing helpers (slash menu, suggestions, uploads)? */
  readonly interactive: boolean;
  /** Opens the embed URL dialog (palette entry "Einbetten") */
  readonly onRequestEmbed: () => void;
  /** Opens the link dialog (palette entry "Link") */
  readonly onRequestLink: () => void;
}

/**
 * Extension list of the collaborative editor: the schema extensions from
 * the shared package plus the app-side editing helpers for users who can
 * edit.
 */
export const useWikiEditorExtensions = ({
  pageId,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  collaboration = false,
  interactive,
  onRequestEmbed,
  onRequestLink,
}: Options): AnyExtension[] => {
  const trpcUtils = api.useUtils();

  const baseExtensions = withWikiPageIndexNodeView(
    withWikiRoleCitizensNodeView(
      withWikiCitizenMentionPopover(
        getWikiEditorExtensions({
          collaboration,
          twitchParentHost: getWikiTwitchParentHost(),
          iframeAllowlist,
          pages: linkablePages,
          citizens: mentionedCitizens,
        }),
      ),
    ),
    pageId,
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
          WikiSlashCommand.configure({ pageId, onRequestEmbed, onRequestLink }),
          WikiPageLinkSuggestion.configure({ pages: linkablePages }),
          WikiCitizenMentionSuggestion.configure({
            fetchCitizens: () => trpcUtils.citizens.getAllCitizens.ensureData(),
          }),
          WikiNodeClickSelection,
          WikiActiveNodeHighlight,
          createWikiFileHandler(pageId),
        ]
      : []),
  ];
};
