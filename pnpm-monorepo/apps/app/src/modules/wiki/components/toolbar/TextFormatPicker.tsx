"use client";

import type { ChainedCommands } from "@tiptap/core";
import { useEditorState, type Editor } from "@tiptap/react";
import clsx from "clsx";
import { FaBold, FaItalic, FaStrikethrough, FaUnderline } from "react-icons/fa";

export const TEXT_FORMAT_OPTIONS = [
  { name: "bold", title: "Fett", icon: FaBold },
  { name: "italic", title: "Kursiv", icon: FaItalic },
  { name: "underline", title: "Unterstrichen", icon: FaUnderline },
  { name: "strike", title: "Durchgestrichen", icon: FaStrikethrough },
] as const;

/**
 * Runs the toggle command for a text format on a prepared chain. Shared by
 * the toolbar picker and the contextual edit menu.
 */
export const toggleWikiTextFormat = (
  chain: ChainedCommands,
  name: (typeof TEXT_FORMAT_OPTIONS)[number]["name"],
) => {
  switch (name) {
    case "bold":
      chain.toggleBold().run();
      break;

    case "italic":
      chain.toggleItalic().run();
      break;

    case "underline":
      chain.toggleUnderline().run();
      break;

    case "strike":
      chain.toggleStrike().run();
      break;

    default:
      throw new Error(`Unknown format: ${name satisfies never}`);
  }
};

interface Props {
  readonly editor: Editor | null;
}

/**
 * Stays open after toggling so several formats can be combined.
 */
export const TextFormatPicker = ({ editor }: Props) => {
  const activeFormats = useEditorState({
    editor,
    selector: ({ editor }) =>
      TEXT_FORMAT_OPTIONS.filter((option) => editor?.isActive(option.name)).map(
        (option) => option.name,
      ),
  });

  const toggle = (name: (typeof TEXT_FORMAT_OPTIONS)[number]["name"]) => {
    if (!editor) return;
    toggleWikiTextFormat(editor.chain().focus(), name);
  };

  return (
    <div className="flex items-center gap-1">
      {TEXT_FORMAT_OPTIONS.map(({ name, title, icon: Icon }) => (
        <button
          key={name}
          type="button"
          title={title}
          onClick={() => toggle(name)}
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-300":
                activeFormats?.includes(name),
              "text-neutral-300": !activeFormats?.includes(name),
            },
          )}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};
