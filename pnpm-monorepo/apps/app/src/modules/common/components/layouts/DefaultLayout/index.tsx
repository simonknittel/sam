import { Hero } from "@/modules/common/components/Hero";
import { type ComponentProps, type ReactNode } from "react";
import { Link } from "../../Link";
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
      <div className="fixed left-0 right-0 top-0 lg:top-14 z-20 bg-black p-2 flex gap-2 justify-between lg:justify-start border-b border-neutral-800">
        <Link href={`/app/${slug}`}>
          <Hero
            text={title}
            withGlitch
            size="sm"
            className="lg:px-6 overflow-hidden flex-initial"
          />
        </Link>

        <div className="flex-1 flex flex-row-reverse lg:flex-row gap-1 lg:justify-between">
          {pages && <Navigation pages={pages} />}
          {cta}
        </div>
      </div>

      <main>{children}</main>
    </>
  );
};
