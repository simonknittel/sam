"use client";

import type { WikiFloatImageSide } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { TbFloatLeft, TbFloatNone, TbFloatRight } from "react-icons/tb";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { floatWikiImage, unfloatWikiImage } from "../wikiImageFloat";

interface Props {
  readonly editor: Editor;
  /** Document position of the image (block or floated) */
  readonly position: number;
  /** Current float side, NULL for the (unfloated) block image */
  readonly floatSide: WikiFloatImageSide | null;
}

const FLOAT_SIDE_OPTIONS: readonly {
  side: WikiFloatImageSide;
  title: string;
  icon: typeof TbFloatLeft;
}[] = [
  { side: "left", title: "Vom Text umflossen (links)", icon: TbFloatLeft },
  { side: "right", title: "Vom Text umflossen (rechts)", icon: TbFloatRight },
];

/**
 * Float actions of the image menus: floating a block image moves it into
 * the neighboring paragraph, unfloating moves it back out
 * (wikiImageFloat.ts).
 */
export const WikiImageFloatActions = ({
  editor,
  position,
  floatSide,
}: Props) => (
  <>
    {FLOAT_SIDE_OPTIONS.map(({ side, title, icon: Icon }) => (
      <ToolbarButton
        key={side}
        title={title}
        isActive={floatSide === side}
        onClick={() => floatWikiImage(editor, position, side)}
      >
        <Icon />
      </ToolbarButton>
    ))}

    {floatSide !== null && (
      <ToolbarButton
        title="Nicht mehr vom Text umfließen"
        isActive={false}
        onClick={() => unfloatWikiImage(editor, position)}
      >
        <TbFloatNone />
      </ToolbarButton>
    )}
  </>
);
