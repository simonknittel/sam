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
    const renderNode = (rendering: ProseMirrorNode): HTMLElement => {
      const serialized = DOMSerializer.fromSchema(
        rendering.type.schema,
      ).serializeNode(rendering) as HTMLElement;

      const image =
        serialized instanceof HTMLImageElement
          ? serialized
          : serialized.querySelector("img");
      if (!image) return serialized;

      const { dimensions, optimized } = resolveWikiImageRendering(
        rendering.attrs,
        getImageDimensions(),
      );
      if (dimensions) {
        image.setAttribute("width", String(dimensions.width));
        image.setAttribute("height", String(dimensions.height));
      }
      if (optimized) {
        image.setAttribute("src", optimized.src);
        image.setAttribute("srcset", optimized.srcSet);
        image.setAttribute("sizes", optimized.sizes);
        image.setAttribute("loading", "lazy");
        image.setAttribute("decoding", "async");
      }

      return serialized;
    };

    return {
      dom: renderNode(node),
      /**
       * Attribute changes (resize drags, alignment) recreate the node view
       * — the same redraw ProseMirror performed before this node view
       * existed, so re-anchoring behaviors keep working unchanged.
       */
      update: () => false,
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
