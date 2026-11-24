/** Discord sends an avatar only in a power of two from 16 to 4096 pixels */
const MINIMUM_IMAGE_SIZE = 16;
const MAXIMUM_IMAGE_SIZE = 4096;

/**
 * Two image pixels for each CSS pixel, thus the avatar is sharp on a screen
 * with a pixel ratio of 2
 */
const PIXEL_RATIO = 2;

export enum DiscordAvatarMotion {
  Animated = "animated",
  /** The first frame of an animated avatar */
  Still = "still",
}

/** Null for a value that is not a URL */
export const getDiscordAvatarSource = (
  avatarUrl: string,
  cssSize: number,
  motion: DiscordAvatarMotion,
) => {
  let url: URL;
  try {
    url = new URL(avatarUrl);
  } catch {
    return null;
  }

  /** WebP without `animated=true` is the first frame */
  if (motion === DiscordAvatarMotion.Still)
    url.pathname = url.pathname.replace(/\.gif$/, ".webp");

  const imageSize = Math.min(
    Math.max(
      2 ** Math.ceil(Math.log2(cssSize * PIXEL_RATIO)),
      MINIMUM_IMAGE_SIZE,
    ),
    MAXIMUM_IMAGE_SIZE,
  );
  url.searchParams.set("size", imageSize.toString());

  return url.toString();
};
