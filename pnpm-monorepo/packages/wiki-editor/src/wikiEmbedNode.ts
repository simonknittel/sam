import { mergeAttributes, Node } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";
import { renderWikiBlockedPlaceholder } from "./wikiBlockedPlaceholder.js";
import {
  WIKI_WIDE_WIDTH_PX,
  wikiAlignAttribute,
  wikiHeightPxAttribute,
  wikiWidthPxAttribute,
  type WikiNodeAlignment,
} from "./wikiResizableNodes.js";

/**
 * "iframe" is the generic, allowlist-validated website embed; the other
 * providers have fixed, hardcoded host patterns.
 */
const WIKI_EMBED_PROVIDERS = [
  "youtube",
  "twitch",
  "spotify",
  "google",
  "iframe",
] as const;
type WikiEmbedProvider = (typeof WIKI_EMBED_PROVIDERS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiEmbed: {
      /**
       * Inserts an embed at the current position. The src is validated
       * against the provider's fixed host patterns — or, for provider
       * "iframe", against the domain allowlist. The size/alignment
       * attributes carry a previous node's layout through a URL update.
       */
      setWikiEmbed: (attributes: {
        provider: WikiEmbedProvider;
        src: string;
        widthPx?: number | "full" | null;
        heightPx?: number | null;
        align?: WikiNodeAlignment | null;
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
  /**
   * Hostnames generic iframes (provider "iframe") may embed (from the wiki
   * settings). An entry matches its exact hostname and all subdomains.
   * Rendering re-validates on every render, so removing an entry blocks
   * existing embeds too.
   */
  iframeAllowlist: readonly string[];
}

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_WATCH_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
];
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

/** YouTube's t/start parameter ("90", "90s", "1h2m30s") in seconds */
const parseYoutubeStartSeconds = (url: URL): number => {
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start");
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!match || (!match[1] && !match[2] && !match[3])) return 0;
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
};

const normalizeYoutubeUrl = (url: URL): string | null => {
  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second] = segments;

  let id: string | null | undefined = null;

  if (url.hostname === "youtu.be") {
    if (segments.length === 1) id = first;
  } else if (YOUTUBE_WATCH_HOSTS.includes(url.hostname)) {
    if (segments.length === 1 && first === "watch")
      id = url.searchParams.get("v");
    else if (
      segments.length === 2 &&
      first &&
      ["shorts", "live", "embed"].includes(first)
    )
      id = second;
  } else if (
    url.hostname === "www.youtube-nocookie.com" ||
    url.hostname === "youtube-nocookie.com"
  ) {
    /**
     * Already-normalized embed URLs pass through (round-trip when editing
     * an existing embed).
     */
    if (segments.length === 2 && first === "embed") id = second;
  }

  if (!id || !YOUTUBE_ID_PATTERN.test(id)) return null;

  const start = parseYoutubeStartSeconds(url);
  return `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ""}`;
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
 * if it is not a recognized YouTube/Twitch/Spotify/Google URL. Generic
 * websites (provider "iframe") are not covered here — they are the
 * caller's allowlist-validated fallback.
 */
export const normalizeWikiEmbedUrl = (
  input: string,
): { provider: WikiEmbedProvider; src: string } | null => {
  const url = parseUrl(input.trim());
  if (!url) return null;

  const youtube = normalizeYoutubeUrl(url);
  if (youtube) return { provider: "youtube", src: youtube };

  const twitch = normalizeTwitchUrl(url);
  if (twitch) return { provider: "twitch", src: twitch };

  const spotify = normalizeSpotifyUrl(url);
  if (spotify) return { provider: "spotify", src: spotify };

  const google = normalizeGoogleUrl(url);
  if (google) return { provider: "google", src: google };

  return null;
};

/**
 * Checks a generic iframe src against the allowlist: https-only, hostname
 * must equal an entry or be a subdomain of one.
 */
export const isWikiIframeSrcAllowed = (
  src: unknown,
  allowlist: readonly string[],
): boolean => {
  if (typeof src !== "string") return false;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  return allowlist.some((entry) => {
    const hostname = entry.trim().toLowerCase();
    if (!hostname) return false;
    return url.hostname === hostname || url.hostname.endsWith(`.${hostname}`);
  });
};

/**
 * All generic-iframe src values of a Tiptap JSON document, e.g. for
 * re-validating imported content against the allowlist (imports bypass the
 * insertion-time check).
 */
export const collectWikiIframeSrcs = (content: unknown): string[] => {
  const srcs = new Set<string>();

  walkWikiContent(content, (node) => {
    if (
      node.type === "wikiEmbed" &&
      node.attrs?.provider === "iframe" &&
      typeof node.attrs.src === "string"
    )
      srcs.add(node.attrs.src);
  });

  return [...srcs];
};

/**
 * Re-validates a stored embed src against the fixed per-provider host
 * patterns — or, for provider "iframe", the domain allowlist. Stored
 * documents are user input (and could bypass the insertion UI), so the src
 * is checked again on every render.
 */
export const isAllowedWikiEmbedSrc = (
  provider: unknown,
  src: unknown,
  iframeAllowlist: readonly string[],
): boolean => {
  if (typeof provider !== "string" || typeof src !== "string") return false;
  const url = parseUrl(src);
  if (!url || url.protocol !== "https:") return false;
  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second, third, fourth] = segments;

  switch (provider) {
    case "youtube":
      return (
        url.hostname === "www.youtube-nocookie.com" &&
        segments.length === 2 &&
        first === "embed" &&
        typeof second === "string" &&
        YOUTUBE_ID_PATTERN.test(second)
      );

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

    case "iframe":
      return isWikiIframeSrcAllowed(src, iframeAllowlist);

    default:
      return false;
  }
};

/**
 * The wiki's single embed node: YouTube, Twitch, Spotify and Google
 * Docs/Sheets/Slides/Drive with fixed, hardcoded host patterns, plus
 * generic websites (provider "iframe") validated against the domain
 * allowlist from the wiki settings. Deliberately no paste rules — pasted
 * URLs stay links; embedding is an explicit action.
 */
export const WikiEmbed = Node.create<WikiEmbedOptions>({
  name: "wikiEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      twitchParentHost: "",
      iframeAllowlist: [],
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
      // Embeds are space-hungry — they default to the wide preset
      ...wikiWidthPxAttribute(WIKI_WIDE_WIDTH_PX),
      /**
       * Only offered by the resize UI for provider "iframe" (see
       * isWikiHeightResizable) — the other providers' heights follow their
       * player's aspect ratio or fixed stylesheet height.
       */
      ...wikiHeightPxAttribute(),
      ...wikiAlignAttribute(),
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-embed]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const provider = node.attrs.provider as string | null;
    const src = node.attrs.src as string | null;

    if (!isAllowedWikiEmbedSrc(provider, src, this.options.iframeAllowlist))
      return renderWikiBlockedPlaceholder(
        HTMLAttributes,
        provider === "iframe"
          ? `Eingebettete Inhalte von dieser Domain sind nicht erlaubt: ${String(src ?? "")}`
          : undefined,
      );

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
          /**
           * Generic websites are untrusted and run sandboxed; the dedicated
           * providers keep their player-specific permissions.
           */
          ...(provider === "iframe"
            ? {
                sandbox:
                  "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation",
                allow: "clipboard-write; encrypted-media; fullscreen",
              }
            : {
                allow:
                  provider === "youtube"
                    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    : "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
              }),
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
          if (
            !isAllowedWikiEmbedSrc(
              attributes.provider,
              attributes.src,
              this.options.iframeAllowlist,
            )
          )
            return false;
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },
});
