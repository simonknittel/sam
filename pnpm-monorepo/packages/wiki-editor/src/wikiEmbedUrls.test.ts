import { describe, expect, test } from "vitest";
import { isAllowedWikiEmbedSrc, normalizeWikiEmbedUrl } from "./index.js";

describe("normalizeWikiEmbedUrl", () => {
  test.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "youtube",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    [
      "https://youtu.be/dQw4w9WgXcQ?t=90",
      "youtube",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
    ],
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m30s",
      "youtube",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=3750",
    ],
    [
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "youtube",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    [
      "https://m.youtube.com/live/dQw4w9WgXcQ",
      "youtube",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    [
      "https://www.twitch.tv/videos/123456789",
      "twitch",
      "https://player.twitch.tv/?video=123456789&autoplay=false",
    ],
    [
      "https://twitch.tv/somechannel",
      "twitch",
      "https://player.twitch.tv/?channel=somechannel&autoplay=false",
    ],
    [
      "https://www.twitch.tv/somechannel/clip/FunnyClip-abc123",
      "twitch",
      "https://clips.twitch.tv/embed?clip=FunnyClip-abc123&autoplay=false",
    ],
    [
      "https://clips.twitch.tv/FunnyClip-abc123",
      "twitch",
      "https://clips.twitch.tv/embed?clip=FunnyClip-abc123&autoplay=false",
    ],
    [
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      "spotify",
      "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT",
    ],
    [
      "https://open.spotify.com/intl-de/album/4cOdK2wGLETKBW3PvgPWqT?si=abc",
      "spotify",
      "https://open.spotify.com/embed/album/4cOdK2wGLETKBW3PvgPWqT",
    ],
    [
      "https://docs.google.com/document/d/abc_DEF-123/edit?usp=sharing",
      "google",
      "https://docs.google.com/document/d/abc_DEF-123/preview",
    ],
    [
      "https://docs.google.com/spreadsheets/d/abc_DEF-123/edit#gid=0",
      "google",
      "https://docs.google.com/spreadsheets/d/abc_DEF-123/preview",
    ],
    [
      "https://docs.google.com/presentation/d/abc_DEF-123/edit",
      "google",
      "https://docs.google.com/presentation/d/abc_DEF-123/embed",
    ],
    [
      "https://drive.google.com/file/d/abc_DEF-123/view",
      "google",
      "https://drive.google.com/file/d/abc_DEF-123/preview",
    ],
  ])("normalizes %s", (input, provider, src) => {
    expect(normalizeWikiEmbedUrl(input)).toEqual({ provider, src });
  });

  test.each([
    "https://example.com/watch?v=abc",
    "https://www.youtube.com/@somechannel",
    "https://www.youtube.com/watch?v=tooshort",
    "https://www.youtube.com/playlist?list=PL0123456789",
    "https://evil.youtube.com.example.com/watch?v=dQw4w9WgXcQ",
    "https://www.twitch.tv/directory/category/star-citizen",
    "https://www.twitch.tv/videos/notanumber",
    "https://evil.twitch.tv.example.com/videos/123",
    "https://open.spotify.com/user/someone",
    "https://docs.google.com/forms/d/abc/viewform",
    "https://drive.google.com/drive/folders/abc",
    "not a url",
    "javascript:alert(1)",
  ])("rejects %s", (input) => {
    expect(normalizeWikiEmbedUrl(input)).toBeNull();
  });

  test("normalized embed URLs round-trip through normalization", () => {
    const inputs = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=90",
      "https://www.twitch.tv/videos/123456789",
      "https://twitch.tv/somechannel",
      "https://clips.twitch.tv/FunnyClip-abc123",
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      "https://docs.google.com/document/d/abc_DEF-123/edit",
      "https://drive.google.com/file/d/abc_DEF-123/view",
    ];
    for (const input of inputs) {
      const normalized = normalizeWikiEmbedUrl(input);
      expect(normalized).not.toBeNull();
      expect(normalizeWikiEmbedUrl(normalized!.src)).toEqual(normalized);
    }
  });

  test("every normalized URL passes the render-time validation", () => {
    const inputs = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=90",
      "https://www.twitch.tv/videos/123456789",
      "https://twitch.tv/somechannel",
      "https://clips.twitch.tv/FunnyClip-abc123",
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      "https://docs.google.com/document/d/abc_DEF-123/edit",
      "https://docs.google.com/presentation/d/abc_DEF-123/edit",
      "https://drive.google.com/file/d/abc_DEF-123/view",
    ];
    for (const input of inputs) {
      const normalized = normalizeWikiEmbedUrl(input);
      expect(normalized).not.toBeNull();
      expect(
        isAllowedWikiEmbedSrc(normalized?.provider, normalized?.src, []),
      ).toBe(true);
    }
  });
});

describe("isAllowedWikiEmbedSrc", () => {
  test.each([
    ["youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90"],
    [
      "twitch",
      "https://player.twitch.tv/?channel=somechannel&parent=evil.example.com",
    ],
    ["spotify", "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"],
    ["google", "https://docs.google.com/document/d/abc/preview"],
  ])("allows valid %s src", (provider, src) => {
    expect(isAllowedWikiEmbedSrc(provider, src, [])).toBe(true);
  });

  test.each([
    ["youtube", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["youtube", "https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ"],
    ["twitch", "https://player.twitch.tv.example.com/?channel=x"],
    ["twitch", "http://player.twitch.tv/?channel=x"],
    ["spotify", "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"],
    ["google", "https://docs.google.com/forms/d/abc/preview"],
    ["google", "https://example.com/document/d/abc/preview"],
    ["twitch", "javascript:alert(1)"],
    [null, "https://player.twitch.tv/?channel=x"],
    ["twitch", null],
  ])("rejects %s src %s", (provider, src) => {
    expect(isAllowedWikiEmbedSrc(provider, src, [])).toBe(false);
  });

  test("validates provider iframe against the allowlist", () => {
    const allowlist = ["example.com"];
    expect(
      isAllowedWikiEmbedSrc("iframe", "https://example.com/page", allowlist),
    ).toBe(true);
    expect(
      isAllowedWikiEmbedSrc("iframe", "https://sub.example.com/", allowlist),
    ).toBe(true);
    expect(
      isAllowedWikiEmbedSrc("iframe", "https://other.com/page", allowlist),
    ).toBe(false);
    expect(
      isAllowedWikiEmbedSrc("iframe", "https://example.com/page", []),
    ).toBe(false);
  });
});
