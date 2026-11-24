import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { GuideScreenshot, type GuideScreenshotFit } from "./GuideScreenshot";

interface Props {
  readonly icon: IconType;
  readonly title: string;
  readonly screenshot: StaticImageData;
  readonly screenshotAlt: string;
  readonly screenshotFit?: GuideScreenshotFit;
  readonly screenshotSizes: string;
  readonly children: ReactNode;
}

export const GuideFeature = ({
  icon: Icon,
  title,
  screenshot,
  screenshotAlt,
  screenshotFit,
  screenshotSizes,
  children,
}: Props) => {
  return (
    <li className="flex flex-col overflow-hidden rounded-secondary border border-white/5 bg-white/5">
      <GuideScreenshot
        src={screenshot}
        alt={screenshotAlt}
        sizes={screenshotSizes}
        fit={screenshotFit}
        className="aspect-16/10 border-b"
      />

      <div className="p-4">
        <h4 className="flex items-center gap-2 font-bold">
          <Icon aria-hidden className="flex-none text-brand-red-300" />
          {title}
        </h4>

        <div className="mt-1 text-sm leading-relaxed text-white/70">
          {children}
        </div>
      </div>
    </li>
  );
};
