import clsx from "clsx";
import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { GuideFeature } from "./GuideFeature";
import type { GuideScreenshotFit } from "./GuideScreenshot";

/** Select the number that the features fill, so that no card stands alone */
export enum GuideFeatureColumns {
  Two = "two",
  Three = "three",
}

/**
 * The width of a card: all of the content below the `md` breakpoint, half of
 * it from `md`, and a third of it from `xl` with three columns
 */
const SCREENSHOT_SIZES: Record<GuideFeatureColumns, string> = {
  [GuideFeatureColumns.Two]: "(min-width: 48rem) 50vw, 100vw",
  [GuideFeatureColumns.Three]:
    "(min-width: 80rem) 33vw, (min-width: 48rem) 50vw, 100vw",
};

export interface GuideFeatureItem {
  readonly icon: IconType;
  readonly title: string;
  readonly screenshot: StaticImageData;
  readonly screenshotAlt: string;
  readonly screenshotFit?: GuideScreenshotFit;
  readonly content: ReactNode;
}

interface Props {
  readonly columns: GuideFeatureColumns;
  readonly features: readonly GuideFeatureItem[];
}

export const GuideFeatureList = ({ columns, features }: Props) => {
  return (
    <ul
      className={clsx("grid gap-4 md:grid-cols-2", {
        "xl:grid-cols-3": columns === GuideFeatureColumns.Three,
      })}
    >
      {features.map(({ content, ...feature }) => (
        <GuideFeature
          key={feature.title}
          {...feature}
          screenshotSizes={SCREENSHOT_SIZES[columns]}
        >
          {content}
        </GuideFeature>
      ))}
    </ul>
  );
};
