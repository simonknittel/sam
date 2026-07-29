import { mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import { renderWikiBlockedPlaceholder } from "./wikiBlockedPlaceholder.js";
import {
  wikiAlignAttribute,
  wikiWidthPercentAttribute,
} from "./wikiResizableNodes.js";

export const WIKI_EMBED_PROVIDERS = ["twitch", "spotify", "google"] as const;
export type WikiEmbedProvider = (typeof WIKI_EMBED_PROVIDERS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiEmbed: {
      /** Inserts a Twitch/Spotify/Google embed at the current position */
      setWikiEmbed: (attributes: {
        provider: WikiEmbedProvider;
        src: string;
      }) => ReturnType;
    };
  }
}

export interface WikiEmbedOptions {
  /**
   * Hostname of the app (without scheme/port), required by Twitch's player
   * as its `parent` query parameter. Twitch embeds render an error frame
   * when unset.
   */
  twitchParentHost: string;
}

const TWITCH_CHANNEL_PATTERN = /^[a-zA-Z0-9_]{3,25}$/;
/** twitch.tv paths that are not channel pages */
const TWITCH_RESERVED_PATHS = [
  "directory",
  "downloads",
  "drops",
  "jobs",
  "p",
  "search",
  "settings",
  "subscriptions",
  "turbo",
  "videos",
  "wallet",
];
const SPOTIFY_TYPES = [
  "track",
  "album",
  "playlist",
  "episode",
  "show",
  "artist",
];
const GOOGLE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const parseUrl = (input: string): URL | null => {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
};

const normalizeTwitchUrl = (url: URL): string | null => {
  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second, third] = segments;

  /**
   * Already-normalized embed URLs pass through (round-trip when editing an
   * existing embed).
   */
  if (url.hostname === "player.twitch.tv") {
    const video = url.searchParams.get("video");
    if (video && /^\d+$/.test(video))
      return `https://player.twitch.tv/?video=${video}&autoplay=false`;
    const channel = url.searchParams.get("channel");
    if (channel && TWITCH_CHANNEL_PATTERN.test(channel))
      return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&autoplay=false`;
    return null;
  }

  if (url.hostname === "clips.twitch.tv") {
    if (first === "embed") {
      const clip = url.searchParams.get("clip");
      return clip
        ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&autoplay=false`
        : null;
    }
    if (segments.length === 1 && first)
      return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(first)}&autoplay=false`;
    return null;
  }

  if (url.hostname !== "www.twitch.tv" && url.hostname !== "twitch.tv")
    return null;

  if (
    first === "videos" &&
    segments.length === 2 &&
    second &&
    /^\d+$/.test(second)
  )
    return `https://player.twitch.tv/?video=${second}&autoplay=false`;

  if (
    segments.length === 3 &&
    second === "clip" &&
    first &&
    third &&
    TWITCH_CHANNEL_PATTERN.test(first)
  )
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(third)}&autoplay=false`;

  if (
    segments.length === 1 &&
    first &&
    TWITCH_CHANNEL_PATTERN.test(first) &&
    !TWITCH_RESERVED_PATHS.includes(first.toLowerCase())
  )
    return `https://player.twitch.tv/?channel=${encodeURIComponent(first)}&autoplay=false`;

  return null;
};

const normalizeSpotifyUrl = (url: URL): string | null => {
  if (url.hostname !== "open.spotify.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0]?.startsWith("intl-")) segments.shift();
  if (segments[0] === "embed") segments.shift();
  const [type, id] = segments;

  if (
    segments.length === 2 &&
    type &&
    SPOTIFY_TYPES.includes(type) &&
    id &&
    /^[a-zA-Z0-9]+$/.test(id)
  )
    return `https://open.spotify.com/embed/${type}/${id}`;

  return null;
};

const normalizeGoogleUrl = (url: URL): string | null => {
  const segments = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "docs.google.com") {
    const [product, marker, id] = segments;
    if (
      marker === "d" &&
      typeof id === "string" &&
      GOOGLE_ID_PATTERN.test(id)
    ) {
      if (product === "document" || product === "spreadsheets")
        return `https://docs.google.com/${product}/d/${id}/preview`;
      if (product === "presentation")
        return `https://docs.google.com/presentation/d/${id}/embed`;
    }
    return null;
  }

  if (url.hostname === "drive.google.com") {
    const [product, marker, id] = segments;
    if (
      product === "file" &&
      marker === "d" &&
      typeof id === "string" &&
      GOOGLE_ID_PATTERN.test(id)
    )
      return `https://drive.google.com/file/d/${id}/preview`;
    return null;
  }

  return null;
};

/**
 * Turns a URL pasted/entered by a user into the matching embed URL, or null
 * if it is not a recognized Twitch/Spotify/Google URL.
 */
export const normalizeWikiEmbedUrl = (
  input: string,
): { provider: WikiEmbedProvider; src: string } | null => {
  const url = parseUrl(input.trim());
  if (!url) return null;

  const twitch = normalizeTwitchUrl(url);
  if (twitch) return { provider: "twitch", src: twitch };

  const spotify = normalizeSpotifyUrl(url);
  if (spotify) return { provider: "spotify", src: spotify };

  const google = normalizeGoogleUrl(url);
  if (google) return { provider: "google", src: google };

  return null;
};

/**
 * Re-validates a stored embed src against the fixed per-provider host
 * patterns. Stored documents are user input (and could bypass the
 * insertion UI), so the src is checked again on every render.
 */
export const isAllowedWikiEmbedSrc = (
  provider: unknown,
  src: unknown,
): boolean => {
  if (typeof provider !== "string" || typeof src !== "string") return false;
  const url = parseUrl(src);
  if (!url || url.protocol !== "https:") return false;
  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second, third, fourth] = segments;

  switch (provider) {
    case "twitch":
      return (
        (url.hostname === "player.twitch.tv" && segments.length === 0) ||
        (url.hostname === "clips.twitch.tv" &&
          segments.length === 1 &&
          first === "embed")
      );

    case "spotify":
      return (
        url.hostname === "open.spotify.com" &&
        segments.length === 3 &&
        first === "embed" &&
        typeof second === "string" &&
        SPOTIFY_TYPES.includes(second)
      );

    case "google":
      if (url.hostname === "docs.google.com")
        return (
          segments.length === 4 &&
          typeof first === "string" &&
          ["document", "spreadsheets", "presentation"].includes(first) &&
          second === "d" &&
          typeof third === "string" &&
          GOOGLE_ID_PATTERN.test(third) &&
          typeof fourth === "string" &&
          ["preview", "embed"].includes(fourth)
        );
      return (
        url.hostname === "drive.google.com" &&
        segments.length === 4 &&
        first === "file" &&
        second === "d" &&
        typeof third === "string" &&
        GOOGLE_ID_PATTERN.test(third) &&
        fourth === "preview"
      );

    default:
      return false;
  }
};

const PASTE_PATTERNS = [
  /https:\/\/(?:www\.)?twitch\.tv\/videos\/\d+\S*/g,
  /https:\/\/(?:www\.)?twitch\.tv\/[a-zA-Z0-9_]{3,25}\/clip\/\S+/g,
  /https:\/\/clips\.twitch\.tv\/[a-zA-Z0-9_-]+\S*/g,
  /https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:track|album|playlist|episode|show|artist)\/[a-zA-Z0-9]+\S*/g,
  /https:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/[a-zA-Z0-9_-]+\S*/g,
  /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\S*/g,
];

/**
 * Embeds for Twitch, Spotify and Google Docs/Sheets/Slides/Drive with
 * fixed, hardcoded host patterns (YouTube uses @tiptap/extension-youtube).
 * Generic iframes are a separate, allowlist-validated node.
 */
export const WikiEmbed = Node.create<WikiEmbedOptions>({
  name: "wikiEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      twitchParentHost: "",
    };
  },

  addAttributes() {
    return {
      provider: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-provider"),
        renderHTML: (attributes) =>
          attributes.provider === null
            ? {}
            : { "data-provider": String(attributes.provider) },
      },
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) =>
          attributes.src === null ? {} : { "data-src": String(attributes.src) },
      },
      ...wikiWidthPercentAttribute(),
      ...wikiAlignAttribute(),
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-embed]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const provider = node.attrs.provider as string | null;
    const src = node.attrs.src as string | null;

    if (!isAllowedWikiEmbedSrc(provider, src))
      return renderWikiBlockedPlaceholder(HTMLAttributes);

    let iframeSrc = String(src);
    if (provider === "twitch") {
      /**
       * Twitch requires the embedding site's hostname as `parent` — it is
       * appended at render time so stored documents stay host-independent.
       */
      const url = new URL(iframeSrc);
      url.searchParams.set("parent", this.options.twitchParentHost);
      iframeSrc = url.toString();
    }

    return [
      "div",
      mergeAttributes({ "data-wiki-embed": "" }, HTMLAttributes),
      [
        "iframe",
        {
          src: iframeSrc,
          allow:
            "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
          /**
           * Camel-cased for the React static renderer; the editor DOM is
           * unaffected (setAttribute lowercases HTML attribute names).
           */
          allowFullScreen: true,
          loading: "lazy",
          referrerPolicy: "strict-origin-when-cross-origin",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setWikiEmbed:
        (attributes) =>
        ({ commands }) => {
          if (!isAllowedWikiEmbedSrc(attributes.provider, attributes.src))
            return false;
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },

  addPasteRules() {
    return PASTE_PATTERNS.map((pattern) =>
      nodePasteRule({
        find: pattern,
        type: this.type,
        getAttributes: (match) => normalizeWikiEmbedUrl(match[0]),
      }),
    );
  },
});
