"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { FaBars, FaExternalLinkAlt } from "react-icons/fa";

export interface Page {
  url: string;
  title: string;
  icon?: ReactNode;
  external?: boolean;
}

interface Props {
  readonly pages: Page[];
}

export const Navigation = ({ pages }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigationId = useId();

  /**
   * The navigation lives in a layout and survives navigations. Thus the
   * mobile navigation must close itself after a link was followed.
   */
  const pathname = usePathname();
  const [closedForPathname, setClosedForPathname] = useState(pathname);
  if (pathname !== closedForPathname) {
    setClosedForPathname(pathname);
    setIsOpen(false);
  }

  return (
    <>
      <div className="lg:hidden">
        <Button2
          type="button"
          onClick={() => setIsOpen((previousIsOpen) => !previousIsOpen)}
          variant={Button2Variant.Secondary}
          aria-expanded={isOpen}
          aria-controls={navigationId}
        >
          <FaBars />
          <span className="sr-only sm:not-sr-only">Navigation</span>
        </Button2>
      </div>

      <nav
        id={navigationId}
        className={clsx(
          "flex-col gap-0.5 border-b border-neutral-800 bg-black px-2 pb-2 lg:flex-row lg:border-b-0 lg:bg-transparent lg:px-0 lg:pb-0",
          {
            "fixed top-12 right-0 left-0 flex lg:static": isOpen,
            "hidden lg:flex": !isOpen,
          },
        )}
      >
        {pages?.map((page) => (
          <Item key={page.url} page={page} />
        ))}
      </nav>
    </>
  );
};

interface ItemProps {
  readonly className?: string;
  readonly page: Page;
}

const Item = ({ className, page }: ItemProps) => {
  const pathname = usePathname();

  const isActive = page.url === pathname;

  return (
    <Link
      key={page.url}
      href={page.url}
      className={clsx(
        "flex items-center gap-2 rounded-secondary px-2 py-1 hover:bg-white/20 active:bg-white/30 [&>svg]:text-xs [&>svg]:opacity-50",
        {
          "bg-white/20": isActive,
        },
        className,
      )}
      {...(page.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {page.external ? <FaExternalLinkAlt /> : page.icon}
      {page.title}
    </Link>
  );
};
