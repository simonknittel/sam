"use client";

import type {
  WikiMentionedCitizen,
  WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useEditor, type Editor } from "@tiptap/react";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { updateWikiPageContent } from "../actions/updateWikiPageContent";
import { useWikiEditorExtensions } from "./useWikiEditorExtensions";
import { useWikiEditMode } from "./WikiEditModeProvider";
import "./wikiEditor.css";
import { WikiEditorLayout } from "./WikiEditorLayout";
import type { WikiPageIndexEntry } from "./WikiPageIndexList";
import { WikiPageStaticContent } from "./WikiPageStaticContent";

const AUTOSAVE_DEBOUNCE_MS = 2_000;

type SaveState = "saved" | "dirty" | "saving";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly content: unknown;
  /** Hostnames generic iframes may embed (WikiSetting.iframeAllowlist) */
  readonly iframeAllowlist: readonly string[];
  /** Pages the viewer can see, by id — for internal page links */
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  /** Current handles of the citizens mentioned on the page, by id */
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  /** Resolved page-index lists for the static fallback while loading */
  readonly pageIndexes?: Readonly<
    Record<string, readonly WikiPageIndexEntry[]>
  >;
}

/**
 * Single-user editor with debounced autosave through a server action. Used
 * when the collab server is not configured — otherwise WikiCollabEditor
 * takes over. Starts as a read-only render; the editing chrome only shows
 * while edit mode is toggled on (WikiEditModeToggle).
 */
export const WikiPageEditor = ({
  className,
  pageId,
  content,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  pageIndexes,
}: Props) => {
  const { isEditMode } = useWikiEditMode();

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSaveOfSession = useRef(true);
  const editCount = useRef(0);
  /** Edit count covered by the last successful save — differing counts mean unsaved changes */
  const savedEditCount = useRef(0);
  /**
   * Latest document, so toggling edit mode (which recreates the editor)
   * keeps the edits instead of falling back to the server-rendered content
   * prop.
   */
  const latestDoc = useRef<ProseMirrorNode | null>(null);

  const save = useCallback(
    async (editor: Editor) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }

      // Edits arriving while the request is in flight must keep the state
      // dirty — their own debounced save is already scheduled.
      const editCountAtStart = editCount.current;

      setSaveState("saving");
      try {
        const formData = new FormData();
        formData.set("id", pageId);
        formData.set("content", JSON.stringify(editor.getJSON()));
        if (isFirstSaveOfSession.current)
          formData.set("firstSaveOfSession", "1");

        const response = await updateWikiPageContent(formData);
        if ("error" in response) {
          toast.error(response.error);
          console.error(response);
          setSaveState("dirty");
          return;
        }

        isFirstSaveOfSession.current = false;
        savedEditCount.current = editCountAtStart;
        setSaveState(
          editCount.current === editCountAtStart ? "saved" : "dirty",
        );
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Speichern fehlgeschlagen. Bitte versuche es später erneut.",
        );
        console.error(error);
        setSaveState("dirty");
      }
    },
    [pageId],
  );

  const extensions = useWikiEditorExtensions({
    pageId,
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
    interactive: isEditMode,
  });

  /**
   * Only serialized when the mode flips (the moment the editor is
   * recreated) — the options object is rebuilt every render, and an inline
   * toJSON() there would serialize the whole document each time.
   */
  const initialContent = useMemo(
    () => latestDoc.current?.toJSON() ?? content ?? null,
    [content, isEditMode],
  );

  /**
   * Toggling edit mode recreates the editor (the deps array) — the
   * interactive extensions can't be added or removed at runtime. Pending
   * changes of the outgoing editor are flushed by the effect cleanup below,
   * which runs before the recreation.
   */
  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      editable: isEditMode,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          /** pl-12 is the gutter column (WikiGutter), edit mode only */
          class: clsx("prose prose-invert max-w-none focus:outline-hidden", {
            "min-h-[50vh] pl-12": isEditMode,
          }),
        },
      },
      onUpdate: ({ editor }) => {
        latestDoc.current = editor.state.doc;
        editCount.current += 1;
        setSaveState("dirty");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void save(editor);
        }, AUTOSAVE_DEBOUNCE_MS);
      },
    },
    [isEditMode],
  );

  /**
   * Cmd/Ctrl+S saves immediately (edit mode only — a read-only render must
   * not hijack the browser shortcut); in-app navigation and toggling edit
   * mode off flush pending changes through the cleanup (the recreation
   * destroys the outgoing editor only after cleanups ran); closing the tab
   * with unsaved changes asks for confirmation (a fired-and-forgotten save
   * would be cancelled by the browser).
   */
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void save(editor);
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (editCount.current !== savedEditCount.current) event.preventDefault();
    };

    if (editor.isEditable) window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimer.current) void save(editor);
    };
  }, [editor, save]);

  return (
    <WikiEditorLayout
      className={className}
      pageId={pageId}
      isEditing={isEditMode}
      editor={editor}
      statusSlot={
        <span className="ml-auto pr-2 text-xs text-neutral-500">
          {!editor && "Lädt …"}
          {editor && saveState === "saving" && "Speichert …"}
          {editor && saveState === "dirty" && "Ungespeicherte Änderungen"}
          {editor && saveState === "saved" && "Gespeichert"}
        </span>
      }
      staticFallback={
        <WikiPageStaticContent
          content={content}
          iframeAllowlist={iframeAllowlist}
          linkablePages={linkablePages}
          mentionedCitizens={mentionedCitizens}
          pageIndexes={pageIndexes}
        />
      }
    />
  );
};
