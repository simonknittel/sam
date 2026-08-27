"use client";

import { EditorContent, type Editor } from "@tiptap/react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { WikiEditorToolbar } from "./toolbar/WikiEditorToolbar";
import { WikiEditorOverlays } from "./WikiEditorOverlays";
import { WikiGutter } from "./WikiGutter";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  /** Whether the editing chrome (toolbar, overlays, gutter) is shown */
  readonly isEditing: boolean;
  /** Whether the viewer may upload images to the page */
  readonly canUploadImages: boolean;
  /** Whether the viewer may upload file attachments to the page */
  readonly canUploadAttachments: boolean;
  /** NULL until the editor is ready — the static fallback renders instead */
  readonly editor: Editor | null;
  /** Right end of the toolbar row: save state or collab status dot */
  readonly statusSlot: ReactNode;
  readonly staticFallback: ReactNode;
  /** Opens the embed URL dialog (gutter palette entry "Einbetten") */
  readonly onRequestEmbed: () => void;
  /** Opens the link dialog (gutter palette entry "Link", selection menu) */
  readonly onRequestLink: () => void;
  /** Opens the ship picker (gutter palette entry "Schiff") */
  readonly onRequestVariantLink: () => void;
}

/**
 * Layout of the collaborative editor: toolbar row, content area with the
 * editing overlays, and the statically rendered fallback filling the same
 * space until the editor is ready — so mounting doesn't shift the page.
 */
export const WikiEditorLayout = ({
  className,
  pageId,
  isEditing,
  canUploadImages,
  canUploadAttachments,
  editor,
  statusSlot,
  staticFallback,
  onRequestEmbed,
  onRequestLink,
  onRequestVariantLink,
}: Props) => {
  return (
    <div className={clsx(className)}>
      {isEditing && (
        /* data-wiki-editor-chrome: clicks here keep the focused block */
        <div
          data-wiki-editor-chrome
          className="flex flex-wrap items-center gap-1 border border-neutral-800 rounded-secondary p-1 sticky top-0 z-10 bg-neutral-900"
        >
          <WikiEditorToolbar
            editor={editor}
            pageId={pageId}
            canUploadImages={canUploadImages}
            canUploadAttachments={canUploadAttachments}
          />

          {statusSlot}
        </div>
      )}

      {editor ? (
        <div className={clsx("relative", { "mt-4": isEditing })}>
          <EditorContent editor={editor} />
          {isEditing && (
            <WikiEditorOverlays editor={editor} onRequestLink={onRequestLink} />
          )}
          {isEditing && (
            <WikiGutter
              editor={editor}
              pageId={pageId}
              canUploadImages={canUploadImages}
              canUploadAttachments={canUploadAttachments}
              onRequestEmbed={onRequestEmbed}
              onRequestLink={onRequestLink}
              onRequestVariantLink={onRequestVariantLink}
            />
          )}
        </div>
      ) : (
        <div className={clsx({ "mt-4 min-h-[50vh] pl-12": isEditing })}>
          {staticFallback}
        </div>
      )}
    </div>
  );
};
