"use client";

import {
  WIKI_FULL_WIDTH,
  type WikiNodeAlignment,
} from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import {
  BLOCK_ALIGNMENT_OPTIONS,
  WIDTH_PRESET_OPTIONS,
} from "../toolbar/alignments";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";

interface Props {
  readonly editor: Editor;
  /** Document position of the block */
  readonly position: number;
  readonly widthPx: number | null;
  readonly align: WikiNodeAlignment;
}

/**
 * Width presets and block position of a top-level block, shared by all
 * block menus (the callers gate on the menu's topLevel flag). The presets
 * set the same `widthPx` attribute as the drag handles, so a preset is
 * active when the current width matches it exactly — "Schmal" is the
 * schema default, "Volle Breite" stores the explicit full-width marker
 * (surfaced as NULL in the menu state), and a hand-dragged width matches
 * none.
 */
export const WikiBlockLayoutActions = ({
  editor,
  position,
  widthPx,
  align,
}: Props) => {
  const setAttribute = (
    attribute: "widthPx" | "align",
    value: number | string | null,
  ) => {
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(position, attribute, value);
        return true;
      })
      .run();
  };

  return (
    <>
      {WIDTH_PRESET_OPTIONS.map(
        ({ title, widthPx: presetWidthPx, icon: Icon }) => (
          <ToolbarButton
            key={title}
            title={title}
            isActive={widthPx === presetWidthPx}
            onClick={() =>
              setAttribute("widthPx", presetWidthPx ?? WIKI_FULL_WIDTH)
            }
          >
            <Icon />
          </ToolbarButton>
        ),
      )}

      <ToolbarDivider />

      {BLOCK_ALIGNMENT_OPTIONS.map(({ value, title, icon: Icon }) => (
        <ToolbarButton
          key={value}
          title={title}
          isActive={align === value}
          onClick={() =>
            setAttribute("align", value === "center" ? null : value)
          }
        >
          <Icon />
        </ToolbarButton>
      ))}
    </>
  );
};
