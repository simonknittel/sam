"use client";

import { getWikiSelectionRestrictions } from "@sam-monorepo/wiki-editor";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  FaCaretSquareDown,
  FaCode,
  FaColumns,
  FaGlobe,
  FaHeading,
  FaImage,
  FaInfoCircle,
  FaListUl,
  FaMinus,
  FaPaperclip,
  FaPhotoVideo,
  FaQuoteRight,
  FaRedo,
  FaTable,
  FaUndo,
} from "react-icons/fa";
import {
  insertWikiFile,
  pickWikiFiles,
  WIKI_ATTACHMENT_ACCEPT,
  WIKI_IMAGE_ACCEPT,
} from "../wikiEditorFiles";
import { CalloutPicker } from "./CalloutPicker";
import { EmbedPicker } from "./EmbedPicker";
import { GridPicker } from "./GridPicker";
import { HeadingPicker } from "./HeadingPicker";
import { IframePicker } from "./IframePicker";
import { ListPicker } from "./ListPicker";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarDivider } from "./ToolbarDivider";
import { ToolbarPopover } from "./ToolbarPopover";

interface Props {
  /**
   * NULL while the editor is initializing/syncing: the toolbar renders
   * identically (so there is no layout shift between the server render and
   * the ready editor), buttons just don't do anything yet.
   */
  readonly editor: Editor | null;
  /** Id of the page being edited — target for file uploads */
  readonly pageId: string;
}

/**
 * Shared toolbar of the single-user and the collaborative wiki editor.
 */
export const WikiEditorToolbar = ({ editor, pageId }: Props) => {
  const pickAndInsert = (accept: string) => {
    if (!editor) return;
    pickWikiFiles(accept, (files) => {
      for (const file of files) void insertWikiFile(editor, pageId, file);
    });
  };

  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor === null
        ? null
        : {
            heading: editor.isActive("heading"),
            list:
              editor.isActive("bulletList") ||
              editor.isActive("orderedList") ||
              editor.isActive("taskList"),
            blockquote: editor.isActive("blockquote"),
            codeBlock: editor.isActive("codeBlock"),
            details: editor.isActive("details"),
            callout: editor.isActive("wikiCallout"),
            grid: editor.isActive("wikiGrid"),
            table: editor.isActive("table"),
            image: editor.isActive("image"),
            attachment: editor.isActive("wikiAttachment"),
            embed: editor.isActive("youtube") || editor.isActive("wikiEmbed"),
            iframe: editor.isActive("wikiIframe"),
            /**
             * Text-only contexts (quote, table cell, list item, code
             * block, collapsible-section title) disable the controls
             * that cannot apply there.
             */
            restrictions: getWikiSelectionRestrictions(editor.state),
          },
  });

  const restricted = {
    blocks: active?.restrictions.blocks ?? false,
    grids: active?.restrictions.grids ?? false,
    lists: active?.restrictions.lists ?? false,
  };

  return (
    <>
      <ToolbarPopover
        title="Überschrift"
        isActive={active?.heading ?? false}
        disabled={restricted.blocks}
        icon={<FaHeading />}
      >
        <HeadingPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Liste"
        isActive={active?.list ?? false}
        disabled={restricted.lists}
        icon={<FaListUl />}
      >
        <ListPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarButton
        title="Zitat"
        isActive={active?.blockquote ?? false}
        // Inside a quote the toggle still unwraps it
        disabled={restricted.blocks && !active?.blockquote}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <FaQuoteRight />
      </ToolbarButton>

      <ToolbarButton
        title="Codeblock"
        isActive={active?.codeBlock ?? false}
        // Inside a code block the toggle still converts it back to text
        disabled={restricted.blocks && !active?.codeBlock}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      >
        <FaCode />
      </ToolbarButton>

      <ToolbarButton
        title="Ausklappbarer Abschnitt"
        isActive={active?.details ?? false}
        // From inside (incl. the title) the toggle still unwraps the section
        disabled={restricted.blocks && !active?.details}
        onClick={() => {
          if (!editor) return;
          if (editor.isActive("details")) {
            editor.chain().focus().unsetDetails().run();
          } else {
            editor.chain().focus().setDetails().run();
          }
        }}
      >
        <FaCaretSquareDown />
      </ToolbarButton>

      <ToolbarPopover
        title="Hervorgehobener Block"
        isActive={active?.callout ?? false}
        disabled={restricted.blocks}
        icon={<FaInfoCircle />}
      >
        <CalloutPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Raster einfügen"
        isActive={active?.grid ?? false}
        // Also restricted inside grids — grids never nest
        disabled={restricted.grids}
        icon={<FaColumns />}
      >
        <GridPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarButton
        title="Tabelle einfügen"
        isActive={active?.table ?? false}
        disabled={restricted.blocks}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <FaTable />
      </ToolbarButton>

      <ToolbarButton
        title="Trennlinie"
        isActive={false}
        disabled={restricted.blocks}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      >
        <FaMinus />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Bild einfügen"
        isActive={active?.image ?? false}
        disabled={restricted.blocks}
        onClick={() => pickAndInsert(WIKI_IMAGE_ACCEPT)}
      >
        <FaImage />
      </ToolbarButton>

      <ToolbarButton
        title="Dateianhang einfügen"
        isActive={active?.attachment ?? false}
        disabled={restricted.blocks}
        onClick={() => pickAndInsert(WIKI_ATTACHMENT_ACCEPT)}
      >
        <FaPaperclip />
      </ToolbarButton>

      <ToolbarPopover
        title="Einbetten"
        isActive={active?.embed ?? false}
        disabled={restricted.blocks}
        icon={<FaPhotoVideo />}
      >
        <EmbedPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Website einbetten (iframe)"
        isActive={active?.iframe ?? false}
        disabled={restricted.blocks}
        icon={<FaGlobe />}
      >
        <IframePicker editor={editor} />
      </ToolbarPopover>

      <ToolbarDivider />

      <ToolbarButton
        title="Rückgängig"
        isActive={false}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <FaUndo />
      </ToolbarButton>

      <ToolbarButton
        title="Wiederholen"
        isActive={false}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <FaRedo />
      </ToolbarButton>
    </>
  );
};
