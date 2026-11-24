import {
  EventContainerKind,
  type EventContainer,
} from "../events/eventContainer.js";

/** Relative to the base URL of the app */
export const GLOBAL_WIKI_BASE_PATH = "/app/wiki";

export const getBriefingPath = (container: EventContainer) => {
  switch (container.kind) {
    case EventContainerKind.Event:
      return `/app/events/${container.id}/briefing`;

    case EventContainerKind.Template:
      return `/app/events/templates/${container.id}/briefing`;

    default:
      throw new Error(
        `Unknown event container kind: ${container.kind satisfies never}`,
      );
  }
};

/** The page of a fleet variant: it renders the root page of the variant wiki */
export const getVariantWikiRootPath = (variantId: string) =>
  `/app/fleet/variant/${variantId}`;

export const getVariantWikiBasePath = (variantId: string) =>
  `${getVariantWikiRootPath(variantId)}/wiki`;

/**
 * The bases of the hrefs of the wiki scopes have the shape of
 * `WikiPageHrefBase` of the wiki editor.
 */
export const GLOBAL_WIKI_HREF_BASE = {
  basePath: GLOBAL_WIKI_BASE_PATH,
  rootPageId: null,
  rootHref: null,
};

export const createBriefingWikiHrefBase = (
  container: EventContainer,
  rootPageId: string | null,
) => ({
  basePath: getBriefingPath(container),
  rootPageId,
  rootHref: null,
});

/** The root page serves on the page of the variant, its subpages below it */
export const createVariantWikiHrefBase = (
  variantId: string,
  rootPageId: string,
) => ({
  basePath: getVariantWikiBasePath(variantId),
  rootPageId,
  rootHref: getVariantWikiRootPath(variantId),
});
