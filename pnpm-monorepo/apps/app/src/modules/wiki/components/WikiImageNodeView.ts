import {
  WikiFloatImage,
  WikiImage,
  type WikiImageOptions,
} from "@sam-monorepo/wiki-editor";
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
 * rendering, so the resize handles (which size the anchor), the edit menu
 * and the static read view all see the same structure.
 */
const findImageElement = (element: HTMLElement): HTMLElement | null =>
  element.tagName === "IMG" ? element : element.querySelector("img");

/**
 * Applies the attribute diff between two renderings to the live element.
 * Diffed against the previous rendering, not the live element, so
 * attributes others manage on it — ProseMirror's selection class,
 * decoration attributes — are never touched.
 */
const syncManagedAttributes = (
  target: Element,
  previous: Element,
  next: Element,
) => {
  for (const name of previous.getAttributeNames())
    if (!next.hasAttribute(name)) target.removeAttribute(name);
  for (const name of next.getAttributeNames()) {
    const value = next.getAttribute(name);
    if (value !== null && target.getAttribute(name) !== value)
      target.setAttribute(name, value);
  }
};

const createWikiImageNodeView =
  (
    getImageDimensions: () => Readonly<Record<string, WikiImageDimensions>>,
  ): NodeViewRenderer =>
  ({ node }) => {
    let renderedNode = node;

    /**
     * Built in an inert document: an img created in the live document
     * starts downloading its src immediately, even while detached — the
     * original file would load alongside the optimized variant. Images in
     * an inert document never load; the browser only evaluates the final
     * attribute set once the returned element is imported and mounted.
     */
    const buildRendering = (nodeToRender: ProseMirrorNode): HTMLElement => {
      const inertDocument = document.implementation.createHTMLDocument();
      const serialized = DOMSerializer.fromSchema(
        nodeToRender.type.schema,
      ).serializeNode(nodeToRender, { document: inertDocument }) as HTMLElement;

      const image = findImageElement(serialized);
      if (!image) return serialized;

      const { dimensions, optimized } = resolveWikiImageRendering(
        nodeToRender.attrs,
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

      return serialized;
    };

    let rendering = buildRendering(node);
    const dom = document.importNode(rendering, true);

    return {
      dom,
      /**
       * Attribute changes (resize drags dispatch one per animation frame,
       * alignment) are patched onto the existing elements: recreating the
       * img mid-drag would blank it while a not yet cached optimizer
       * candidate loads. Decoration-only updates leave the DOM entirely
       * alone — recreating on them would loop, because the active-node
       * highlight decorates the hovered and the focused block, and the
       * overlays re-anchor on every redraw.
       */
      update: (updatedNode) => {
        if (updatedNode.type !== renderedNode.type) return false;
        if (!updatedNode.sameMarkup(renderedNode)) {
          const replacement = buildRendering(updatedNode);
          const liveImage = findImageElement(dom);
          const previousImage = findImageElement(rendering);
          const nextImage = findImageElement(replacement);
          const structureChanged =
            replacement.tagName !== rendering.tagName ||
            Boolean(nextImage) !== Boolean(previousImage);
          if (structureChanged) return false;

          syncManagedAttributes(dom, rendering, replacement);
          if (liveImage && previousImage && nextImage && liveImage !== dom)
            syncManagedAttributes(liveImage, previousImage, nextImage);
          rendering = replacement;
        }
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

const WikiFloatImageWithOptimizedView =
  WikiFloatImage.extend<WikiImageNodeViewOptions>({
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
 * Swaps the plain image nodes (block and floated) in an extension list for
 * the node-view variants serving optimized images, keeping their position
 * in the list. Same names, attributes and schema — only the in-editor
 * rendering differs, so save validation, the collab server and the static
 * renderer stay untouched by these variants.
 */
export const withWikiImageOptimization = (
  extensions: AnyExtension[],
  imageDimensions: Readonly<Record<string, WikiImageDimensions>>,
): AnyExtension[] =>
  extensions.map((extension) => {
    if (extension.name === WikiImage.name)
      return WikiImageWithOptimizedView.configure({
        ...(extension.options as WikiImageOptions),
        imageDimensions,
      });
    if (extension.name === WikiFloatImage.name)
      return WikiFloatImageWithOptimizedView.configure({
        ...(extension.options as WikiImageOptions),
        imageDimensions,
      });
    return extension;
  });
