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
  readonly canEdit: boolean;
  /** NULL until the editor is ready — the static fallback renders instead */
  readonly editor: Editor | null;
  /** Right end of the toolbar row: save state or collab status dot */
  readonly statusSlot: ReactNode;
  readonly staticFallback: ReactNode;
}

/**
 * Layout shared by the single-user and the collaborative editor: toolbar
 * row, content area with the editing overlays, and the statically rendered
 * fallback filling the same space until the editor is ready — so mounting
 * doesn't shift the page.
 */
export const WikiEditorLayout = ({
  className,
  pageId,
  canEdit,
  editor,
  statusSlot,
  staticFallback,
}: Props) => {
  return (
    <div className={clsx(className)}>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-1 border border-neutral-800 rounded-secondary p-1 sticky top-0 z-10 bg-neutral-900">
          <WikiEditorToolbar editor={editor} pageId={pageId} />

          {statusSlot}
        </div>
      )}

      {editor ? (
        <div className={clsx("relative", { "mt-4": canEdit })}>
          <EditorContent editor={editor} />
          {canEdit && <WikiEditorOverlays editor={editor} />}
          {canEdit && <WikiGutter editor={editor} pageId={pageId} />}
        </div>
      ) : (
        <div className={clsx({ "mt-4 min-h-[50vh] pl-12": canEdit })}>
          {staticFallback}
        </div>
      )}
    </div>
  );
};
