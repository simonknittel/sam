import clsx from "clsx";
import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { GuideScreenshot } from "./GuideScreenshot";

export enum GuideIntroLayout {
  Side = "side",
  /** For a very wide picture */
  Below = "below",
}

/**
 * The screenshot takes three fifths of the content next to the text, and the
 * full width below it
 */
const SCREENSHOT_SIZES: Record<GuideIntroLayout, string> = {
  [GuideIntroLayout.Side]: "(min-width: 80rem) 60vw, 100vw",
  [GuideIntroLayout.Below]: "100vw",
};

interface Props {
  readonly heading: string;
  /** What the app is, in two or three sentences */
  readonly lead: ReactNode;
  /** `GuideHighlight` items */
  readonly highlights: ReactNode;
  readonly screenshot: StaticImageData;
  readonly screenshotAlt: string;
  readonly layout?: GuideIntroLayout;
}

export const GuideIntro = ({
  heading,
  lead,
  highlights,
  screenshot,
  screenshotAlt,
  layout = GuideIntroLayout.Side,
}: Props) => {
  return (
    <section
      className={clsx("grid items-center gap-8", {
        "xl:grid-cols-[2fr_3fr]": layout === GuideIntroLayout.Side,
      })}
    >
      <div>
        <h3 className="font-mono text-2xl font-bold uppercase">{heading}</h3>

        <p className="mt-3 max-w-prose leading-relaxed text-white/80">{lead}</p>

        <ul
          className={clsx("mt-6 grid gap-4", {
            "md:grid-cols-3": layout === GuideIntroLayout.Below,
          })}
        >
          {highlights}
        </ul>
      </div>

      <GuideScreenshot
        src={screenshot}
        alt={screenshotAlt}
        sizes={SCREENSHOT_SIZES[layout]}
        className="rounded-secondary border"
      />
    </section>
  );
};
