import { Hero } from "@/modules/common/components/Hero";
import { type ComponentProps, type ReactNode } from "react";
import { Link } from "../../Link";
import { MainContent } from "../MainContent";
import { Navigation } from "./Navigation";

interface Props {
  readonly title: string;
  readonly pages?: ComponentProps<typeof Navigation>["pages"] | null;
  readonly cta?: ReactNode;
  readonly children: ReactNode;
  readonly slug: string;
}

export const DefaultLayout = ({ title, pages, cta, children, slug }: Props) => {
  return (
    <>
      {/*
       * The minimum height is the space that the shell keeps free above the
       * main content (`pt-12 lg:pt-28` minus the bar of the shell). A lower
       * header shows a strip of the background above a full-height frame.
       */}
      <div className="fixed top-0 right-0 left-0 z-20 flex min-h-12 items-center justify-between gap-2 border-b border-neutral-800 bg-black p-2 lg:top-14 lg:min-h-14 lg:justify-start">
        <Link href={`/app/${slug}`} className="flex self-center">
          <Hero
            text={title}
            withGlitch
            size="sm"
            className="flex-initial overflow-hidden lg:px-6"
          />
        </Link>

        <div className="flex flex-1 flex-row-reverse gap-1 lg:flex-row lg:justify-between">
          {pages && <Navigation pages={pages} />}
          {cta}
        </div>
      </div>

      <MainContent>{children}</MainContent>
    </>
  );
};
