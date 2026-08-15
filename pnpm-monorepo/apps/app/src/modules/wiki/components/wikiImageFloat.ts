"use client";

import {
  clampWikiWidthPx,
  WIKI_FLOAT_IMAGE_FALLBACK_WIDTH_PX,
  type WikiFloatImageSide,
} from "@sam-monorepo/wiki-editor";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

/**
 * Converting between the block image and the floated image is a structural
 * move, not an attribute change: the float only aligns with the text
 * block's own box (its width, its centering margins) when the image lives
 * INSIDE that block — as an inline node at the paragraph's start. A float
 * at document level would align with the editor instead and detach from
 * the independently sized text column next to it.
 */

/** The image attributes surviving the conversion in both directions */
const copiedImageAttributes = (node: ProseMirrorNode) => ({
  src: node.attrs.src as string | null,
  alt: node.attrs.alt as string | null,
  title: node.attrs.title as string | null,
});

/**
 * The paragraph a floated image should live in: the image's next sibling
 * if it is a paragraph (readers meet the image before the text flowing
 * around it), the previous one as the fallback. NULL when the image has no
 * paragraph next to it.
 */
const adjacentParagraphPosition = ($image: ResolvedPos): number | null => {
  const parent = $image.parent;
  const imageIndex = $image.index();

  const nextSibling =
    imageIndex + 1 < parent.childCount ? parent.child(imageIndex + 1) : null;
  if (nextSibling?.type.name === "paragraph")
    return $image.posAtIndex(imageIndex + 1);

  const previousSibling = imageIndex > 0 ? parent.child(imageIndex - 1) : null;
  if (previousSibling?.type.name === "paragraph")
    return $image.posAtIndex(imageIndex - 1);

  return null;
};

/**
 * Width the floated image starts with: an explicit width is kept, an
 * unsized (or full-width) image gets half the paragraph's current width so
 * the text keeps room to flow next to it.
 */
const initialFloatWidthPx = (
  editor: Editor,
  imageNode: ProseMirrorNode,
  paragraphPosition: number | null,
): number => {
  const widthPx: unknown = imageNode.attrs.widthPx;
  if (typeof widthPx === "number") return clampWikiWidthPx(widthPx);

  if (paragraphPosition !== null) {
    const paragraphElement = editor.view.nodeDOM(paragraphPosition);
    if (
      paragraphElement instanceof HTMLElement &&
      paragraphElement.clientWidth > 0
    )
      return clampWikiWidthPx(Math.round(paragraphElement.clientWidth / 2));
  }

  return WIKI_FLOAT_IMAGE_FALLBACK_WIDTH_PX;
};

/**
 * Floats the image at `position` to the given side of its text: a block
 * image moves into the adjacent paragraph as a floated inline image (or
 * into a fresh paragraph in place when it has none), an already floated
 * image switches sides. The new node is selected so the edit menu and the
 * resize handles follow it.
 */
export const floatWikiImage = (
  editor: Editor,
  position: number,
  floatSide: WikiFloatImageSide,
): boolean => {
  const { state } = editor;
  const node = state.doc.nodeAt(position);
  if (!node) return false;

  if (node.type.name === "wikiFloatImage") {
    if (node.attrs.floatSide === floatSide) return true;
    editor.view.dispatch(
      state.tr.setNodeAttribute(position, "floatSide", floatSide),
    );
    return true;
  }

  if (node.type.name !== "image") return false;
  const floatImageType = state.schema.nodes.wikiFloatImage;
  const paragraphType = state.schema.nodes.paragraph;
  if (!floatImageType || !paragraphType) return false;

  const paragraphPosition = adjacentParagraphPosition(
    state.doc.resolve(position),
  );

  const floatImageNode = floatImageType.create({
    ...copiedImageAttributes(node),
    floatSide,
    widthPx: initialFloatWidthPx(editor, node, paragraphPosition),
  });

  const transaction = state.tr;
  if (paragraphPosition !== null) {
    transaction.delete(position, position + node.nodeSize);
    const insertionPosition = transaction.mapping.map(paragraphPosition) + 1;
    transaction.insert(insertionPosition, floatImageNode);
    transaction.setSelection(
      NodeSelection.create(transaction.doc, insertionPosition),
    );
  } else {
    transaction.replaceWith(
      position,
      position + node.nodeSize,
      paragraphType.create(null, floatImageNode),
    );
    transaction.setSelection(
      NodeSelection.create(transaction.doc, position + 1),
    );
  }
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
};

/**
 * Turns the floated image at `position` back into a block image, placed
 * before its paragraph — or, where the paragraph's container does not
 * allow image blocks (a quote's paragraph), before the closest ancestor
 * whose container does. A paragraph that only held the image is dropped
 * with it.
 */
export const unfloatWikiImage = (editor: Editor, position: number): boolean => {
  const { state } = editor;
  const node = state.doc.nodeAt(position);
  if (node?.type.name !== "wikiFloatImage") return false;
  const imageType = state.schema.nodes.image;
  if (!imageType) return false;

  const $floatImage = state.doc.resolve(position);

  let insertionPosition: number | null = null;
  for (let depth = $floatImage.depth; depth >= 1; depth--) {
    const container = $floatImage.node(depth - 1);
    const childIndex = $floatImage.index(depth - 1);
    if (container.canReplaceWith(childIndex, childIndex, imageType)) {
      insertionPosition = $floatImage.before(depth);
      break;
    }
  }
  if (insertionPosition === null) return false;

  const widthPx: unknown = node.attrs.widthPx;
  const imageNode = imageType.create({
    ...copiedImageAttributes(node),
    widthPx: typeof widthPx === "number" ? clampWikiWidthPx(widthPx) : null,
  });

  const paragraph = $floatImage.parent;
  const paragraphPosition = $floatImage.before();
  const container = $floatImage.node($floatImage.depth - 1);
  const paragraphIndex = $floatImage.index($floatImage.depth - 1);
  const paragraphRemovable =
    paragraph.type.name === "paragraph" &&
    paragraph.content.size === node.nodeSize &&
    container.canReplace(paragraphIndex, paragraphIndex + 1);

  const transaction = state.tr;
  if (paragraphRemovable)
    transaction.delete(
      paragraphPosition,
      paragraphPosition + paragraph.nodeSize,
    );
  else transaction.delete(position, position + node.nodeSize);

  const mappedInsertionPosition = transaction.mapping.map(
    insertionPosition,
    -1,
  );
  transaction.insert(mappedInsertionPosition, imageNode);
  transaction.setSelection(
    NodeSelection.create(transaction.doc, mappedInsertionPosition),
  );
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
};
