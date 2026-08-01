"use client";

import { FaCheck } from "react-icons/fa";
import { ToolbarButton } from "../toolbar/ToolbarButton";

interface Props {
  readonly defaultValue: string;
  readonly onSave: (url: string) => void;
}

/** Inline URL input of the embed and link menus */
export const WikiEditMenuUrlForm = ({ defaultValue, onSave }: Props) => (
  <form
    className="flex items-center gap-1"
    onSubmit={(event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.namedItem("url");
      if (input instanceof HTMLInputElement) onSave(input.value);
    }}
  >
    <input
      name="url"
      type="url"
      required
      defaultValue={defaultValue}
      placeholder="https://…"
      className="w-56 rounded-secondary border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm focus-visible:outline-2 outline-interaction-700"
    />
    <ToolbarButton title="Übernehmen" isActive={false} type="submit">
      <FaCheck />
    </ToolbarButton>
  </form>
);
