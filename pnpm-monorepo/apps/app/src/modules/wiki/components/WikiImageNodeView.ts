import { WikiImage, type WikiImageOptions } from "@sam-monorepo/wiki-editor";
import type { AnyExtension, NodeViewRenderer } from "@tiptap/core";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  resolveWikiImageRendering,
  type WikiImageDimensions,
} from "../utils/wikiImageRendering";

interface WikiImageNodeViewOptions extends WikiImageOptions {
  /** Intrinsic dimensions of the page's uploaded images, by upload id */
  imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
}

/**
 * Renders the image node exactly as its renderHTML does (anchor to the
 * original file around the image), then swaps the img's src for the Next.js
 * image optimizer's srcset when the upload's dimensions are known. Not a
 * React node view on purpose: the DOM stays identical to the schema
 * rendering, so the resize handles (which size the anchor), the hover menu
 * and the static read view all see the same structure.
 */
const createWikiImageNodeView =
  (
    getImageDimensions: () => Readonly<Record<string, WikiImageDimensions>>,
  ): NodeViewRenderer =>
  ({ node }) => {
    let renderedNode = node;
    const renderNode = (rendering: ProseMirrorNode): HTMLElement => {
      /**
       * Serialized into an inert document: an img created in the live
       * document starts downloading its src immediately, even while
       * detached — the original file would load alongside the optimized
       * variant. Images in an inert document never load; the browser only
       * evaluates the final attribute set once the node view is mounted.
       */
      const inertDocument = document.implementation.createHTMLDocument();
      const serialized = DOMSerializer.fromSchema(
        rendering.type.schema,
      ).serializeNode(rendering, { document: inertDocument }) as HTMLElement;

      const image =
        serialized.tagName === "IMG"
          ? serialized
          : serialized.querySelector("img");
      if (!image) return document.importNode(serialized, true);

      const { dimensions, optimized } = resolveWikiImageRendering(
        rendering.attrs,
        getImageDimensions(),
      );
      if (dimensions) {
        image.setAttribute("width", String(dimensions.width));
        image.setAttribute("height", String(dimensions.height));
      }
      if (optimized) {
        image.setAttribute("srcset", optimized.srcSet);
        image.setAttribute("sizes", optimized.sizes);
        image.setAttribute("loading", "lazy");
        image.setAttribute("decoding", "async");
        image.setAttribute("src", optimized.src);
      }

      return document.importNode(serialized, true);
    };

    return {
      dom: renderNode(node),
      /**
       * Mirrors how ProseMirror treated the node before this node view
       * existed: attribute changes (resize drags, alignment) recreate the
       * DOM, everything else — decoration changes above all — keeps it.
       * Recreating on decoration changes would loop: the active-node
       * highlight decorates the hovered block, and the overlays re-anchor
       * on every redraw.
       */
      update: (updatedNode) => {
        if (updatedNode.type !== renderedNode.type) return false;
        if (!updatedNode.sameMarkup(renderedNode)) return false;
        renderedNode = updatedNode;
        return true;
      },
      ignoreMutation: () => true,
    };
  };

const WikiImageWithOptimizedView = WikiImage.extend<WikiImageNodeViewOptions>({
  addOptions() {
    return {
      ...(this.parent?.() as WikiImageOptions),
      imageDimensions: {},
    };
  },

  addNodeView() {
    return createWikiImageNodeView(() => this.options.imageDimensions);
  },
});

/**
 * Swaps the plain image node in an extension list for the node-view
 * variant serving optimized images, keeping its position in the list. Same
 * name, attributes and schema — only the in-editor rendering differs, so
 * save validation, the collab server and the static renderer stay
 * untouched by this variant.
 */
export const withWikiImageOptimization = (
  extensions: AnyExtension[],
  imageDimensions: Readonly<Record<string, WikiImageDimensions>>,
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiImage.name
      ? WikiImageWithOptimizedView.configure({
          ...(extension.options as WikiImageOptions),
          imageDimensions,
        })
      : extension,
  );
