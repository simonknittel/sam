"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  FaBold,
  FaCaretSquareDown,
  FaCode,
  FaColumns,
  FaGlobe,
  FaHeading,
  FaHighlighter,
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
import {
  ALIGNMENT_OPTIONS,
  AlignmentPicker,
  getActiveWikiAlignment,
} from "./AlignmentPicker";
import { CalloutPicker } from "./CalloutPicker";
import { EmbedPicker } from "./EmbedPicker";
import { GridPicker } from "./GridPicker";
import { HeadingPicker } from "./HeadingPicker";
import { HighlightPicker } from "./HighlightPicker";
import { IframePicker } from "./IframePicker";
import { ListPicker } from "./ListPicker";
import { TEXT_FORMAT_OPTIONS, TextFormatPicker } from "./TextFormatPicker";
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
            textFormat: TEXT_FORMAT_OPTIONS.some((option) =>
              editor.isActive(option.name),
            ),
            highlight: editor.isActive("highlight"),
            alignment: getActiveWikiAlignment(editor),
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
          },
  });

  const activeAlignment = active?.alignment ?? "left";
  const ActiveAlignmentIcon =
    ALIGNMENT_OPTIONS.find((option) => option.value === activeAlignment)
      ?.icon ?? ALIGNMENT_OPTIONS[0].icon;

  return (
    <>
      <ToolbarPopover
        title="Überschrift"
        isActive={active?.heading ?? false}
        icon={<FaHeading />}
      >
        <HeadingPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Textformat"
        isActive={active?.textFormat ?? false}
        icon={<FaBold />}
      >
        <TextFormatPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Textmarker"
        isActive={active?.highlight ?? false}
        icon={<FaHighlighter />}
      >
        <HighlightPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarDivider />

      <ToolbarPopover
        title="Ausrichtung"
        isActive={activeAlignment !== "left"}
        icon={<ActiveAlignmentIcon />}
      >
        <AlignmentPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarDivider />

      <ToolbarPopover
        title="Liste"
        isActive={active?.list ?? false}
        icon={<FaListUl />}
      >
        <ListPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarDivider />

      <ToolbarButton
        title="Zitat"
        isActive={active?.blockquote ?? false}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <FaQuoteRight />
      </ToolbarButton>

      <ToolbarButton
        title="Codeblock"
        isActive={active?.codeBlock ?? false}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      >
        <FaCode />
      </ToolbarButton>

      <ToolbarButton
        title="Ausklappbarer Abschnitt"
        isActive={active?.details ?? false}
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
        icon={<FaInfoCircle />}
      >
        <CalloutPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Raster einfügen"
        isActive={active?.grid ?? false}
        icon={<FaColumns />}
      >
        <GridPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarButton
        title="Tabelle einfügen"
        isActive={active?.table ?? false}
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
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      >
        <FaMinus />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Bild einfügen"
        isActive={active?.image ?? false}
        onClick={() => pickAndInsert(WIKI_IMAGE_ACCEPT)}
      >
        <FaImage />
      </ToolbarButton>

      <ToolbarButton
        title="Dateianhang einfügen"
        isActive={active?.attachment ?? false}
        onClick={() => pickAndInsert(WIKI_ATTACHMENT_ACCEPT)}
      >
        <FaPaperclip />
      </ToolbarButton>

      <ToolbarPopover
        title="Einbetten"
        isActive={active?.embed ?? false}
        icon={<FaPhotoVideo />}
      >
        <EmbedPicker editor={editor} />
      </ToolbarPopover>

      <ToolbarPopover
        title="Website einbetten (iframe)"
        isActive={active?.iframe ?? false}
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
