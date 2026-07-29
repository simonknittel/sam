"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { useEditorState, type Editor } from "@tiptap/react";
import clsx from "clsx";
import { FaListOl, FaListUl, FaTasks } from "react-icons/fa";

const LIST_OPTIONS = [
  { name: "bulletList", title: "Liste", icon: FaListUl },
  { name: "orderedList", title: "Nummerierte Liste", icon: FaListOl },
  { name: "taskList", title: "Aufgabenliste", icon: FaTasks },
] as const;

interface Props {
  readonly editor: Editor | null;
}

export const ListPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  const activeList = useEditorState({
    editor,
    selector: ({ editor }) =>
      LIST_OPTIONS.find((option) => editor?.isActive(option.name))?.name ??
      null,
  });

  const toggle = (name: (typeof LIST_OPTIONS)[number]["name"]) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (name) {
      case "bulletList":
        chain.toggleBulletList().run();
        break;

      case "orderedList":
        chain.toggleOrderedList().run();
        break;

      case "taskList":
        chain.toggleTaskList().run();
        break;

      default:
        throw new Error(`Unknown list type: ${name satisfies never}`);
    }
    closePopover();
  };

  return (
    <div className="flex items-center gap-1">
      {LIST_OPTIONS.map(({ name, title, icon: Icon }) => (
        <button
          key={name}
          type="button"
          title={title}
          onClick={() => toggle(name)}
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-300": activeList === name,
              "text-neutral-300": activeList !== name,
            },
          )}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};
