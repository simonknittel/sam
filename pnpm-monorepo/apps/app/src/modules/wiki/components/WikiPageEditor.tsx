"use client";

import type {
  WikiMentionedCitizen,
  WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { useEditor, type Editor } from "@tiptap/react";
import { unstable_rethrow } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { updateWikiPageContent } from "../actions/updateWikiPageContent";
import { useWikiEditorExtensions } from "./useWikiEditorExtensions";
import "./wikiEditor.css";
import { WikiEditorLayout } from "./WikiEditorLayout";
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
}

/**
 * Single-user editor with debounced autosave through a server action. Used
 * when the collab server is not configured — otherwise WikiCollabEditor
 * takes over.
 */
export const WikiPageEditor = ({
  className,
  pageId,
  content,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
}: Props) => {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSaveOfSession = useRef(true);
  const editCount = useRef(0);
  /** Edit count covered by the last successful save — differing counts mean unsaved changes */
  const savedEditCount = useRef(0);

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
    interactive: true,
  });

  const editor = useEditor({
    extensions,
    content: content ?? null,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        /** pl-12 is the gutter column (WikiGutter) */
        class:
          "prose prose-invert max-w-none focus:outline-hidden min-h-[50vh] pl-12",
      },
    },
    onUpdate: ({ editor }) => {
      editCount.current += 1;
      setSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void save(editor);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
  });

  /**
   * Cmd/Ctrl+S saves immediately; in-app navigation flushes pending changes
   * on unmount; closing the tab with unsaved changes asks for confirmation
   * (a fired-and-forgotten save would be cancelled by the browser).
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

    window.addEventListener("keydown", handleKeyDown);
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
      canEdit={true}
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
        />
      }
    />
  );
};
