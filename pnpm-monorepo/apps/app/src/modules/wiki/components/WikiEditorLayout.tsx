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
  readonly isEditing: boolean;
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  /** NULL until the editor is ready — the static fallback renders instead */
  readonly editor: Editor | null;
  readonly statusSlot: ReactNode;
  readonly staticFallback: ReactNode;
  readonly onRequestEmbed: () => void;
  readonly onRequestLink: () => void;
  readonly onRequestVariantLink: () => void;
}

/**
 * The statically rendered fallback fills the same space until the editor is
 * ready, so mounting does not shift the page.
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
        <div
          data-wiki-editor-chrome
          className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-secondary border border-neutral-800 bg-neutral-900 p-1"
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
