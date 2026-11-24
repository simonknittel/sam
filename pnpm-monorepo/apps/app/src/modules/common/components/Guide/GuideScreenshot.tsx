import clsx from "clsx";
import Image, { type StaticImageData } from "next/image";
import { FaUpRightAndDownLeftFromCenter } from "react-icons/fa6";

export enum GuideScreenshotFit {
  /** For a part of the page */
  Contain = "contain",
  /** For a photo-like picture */
  Cover = "cover",
}

interface Props {
  readonly className?: string;
  readonly src: StaticImageData;
  readonly alt: string;
  readonly sizes: string;
  readonly fit?: GuideScreenshotFit;
}

/**
 * The browser loads a lazy image only when it is visible, thus the images load
 * when the user opens the guide.
 */
export const GuideScreenshot = ({
  className,
  src,
  alt,
  sizes,
  fit = GuideScreenshotFit.Contain,
}: Props) => {
  return (
    <a
      href={src.src}
      target="_blank"
      rel="noopener noreferrer"
      title="Screenshot in voller Größe öffnen"
      className={clsx(
        "group/screenshot relative block overflow-hidden border-white/10 bg-black/40 hover:border-white/30 focus-visible:border-white/30 active:border-white/50",
        {
          "p-3": fit === GuideScreenshotFit.Contain,
        },
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        sizes={sizes}
        // An SVG import has no small preview to blur
        placeholder={src.blurDataURL ? "blur" : "empty"}
        className={clsx("size-full", {
          "object-contain": fit === GuideScreenshotFit.Contain,
          "object-cover": fit === GuideScreenshotFit.Cover,
        })}
      />

      <span
        aria-hidden
        className="absolute top-2 right-2 rounded-secondary bg-black/70 p-1.5 text-white opacity-0 group-hover/screenshot:opacity-100 group-focus-visible/screenshot:opacity-100"
      >
        <FaUpRightAndDownLeftFromCenter className="size-3" />
      </span>
    </a>
  );
};
