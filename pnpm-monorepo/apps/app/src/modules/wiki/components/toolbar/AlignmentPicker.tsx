"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import {
  WIKI_RESIZABLE_NODE_TYPES,
  type WikiNodeAlignment,
} from "@sam-monorepo/wiki-editor";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState, type Editor } from "@tiptap/react";
import clsx from "clsx";
import { FaAlignCenter, FaAlignLeft, FaAlignRight } from "react-icons/fa";

export const ALIGNMENT_OPTIONS: readonly {
  value: WikiNodeAlignment;
  title: string;
  icon: typeof FaAlignLeft;
}[] = [
  { value: "left", title: "Linksbündig", icon: FaAlignLeft },
  { value: "center", title: "Zentriert", icon: FaAlignCenter },
  { value: "right", title: "Rechtsbündig", icon: FaAlignRight },
];

/**
 * The selected resizable node (image/embed/iframe), if any — alignment
 * applies to its `align` attribute instead of the text alignment.
 */
const getSelectedAlignableNode = (editor: Editor | null) => {
  if (!editor) return null;
  const { selection } = editor.state;
  if (
    selection instanceof NodeSelection &&
    (WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(
      selection.node.type.name,
    )
  )
    return selection.node;
  return null;
};

/**
 * The alignment of the current selection (node attribute or text align),
 * e.g. for the toolbar trigger icon.
 */
export const getActiveWikiAlignment = (
  editor: Editor | null,
): WikiNodeAlignment => {
  const alignableNode = getSelectedAlignableNode(editor);
  if (alignableNode)
    return ((alignableNode.attrs.align as string | null) ??
      "left") as WikiNodeAlignment;
  for (const option of ALIGNMENT_OPTIONS) {
    if (editor?.isActive({ textAlign: option.value })) return option.value;
  }
  return "left";
};

interface Props {
  readonly editor: Editor | null;
}

export const AlignmentPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();
  const activeAlignment =
    useEditorState({
      editor,
      selector: ({ editor }) => getActiveWikiAlignment(editor),
    }) ?? "left";

  const apply = (alignment: WikiNodeAlignment) => {
    if (!editor) return;
    const alignableNode = getSelectedAlignableNode(editor);
    if (alignableNode) {
      editor
        .chain()
        .focus()
        .updateAttributes(alignableNode.type.name, {
          align: alignment === "left" ? null : alignment,
        })
        .run();
    } else {
      editor.chain().focus().setTextAlign(alignment).run();
    }
    closePopover();
  };

  return (
    <div className="flex items-center gap-1">
      {ALIGNMENT_OPTIONS.map(({ value, title, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={title}
          onClick={() => apply(value)}
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-500": activeAlignment === value,
              "text-neutral-300": activeAlignment !== value,
            },
          )}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};
