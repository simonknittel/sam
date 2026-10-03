"use client";

import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  readonly page: {
    readonly path: string;
    readonly name: string;
    readonly icon?: ReactNode;
    readonly matchesSubpaths?: boolean;
  };
}

export const Item = ({ page }: Props) => {
  const pathname = usePathname();

  const isActive = page.matchesSubpaths
    ? pathname === page.path || pathname.startsWith(`${page.path}/`)
    : page.path === pathname;

  return (
    <Link
      key={page.path}
      href={page.path}
      className={clsx(
        "flex h-8 items-center justify-center gap-2 border border-brand-red-700 px-3 font-mono uppercase first:rounded-l last:rounded-r",
        {
          "bg-brand-red-500 text-white": isActive,
          "text-brand-red-500 hover:border-brand-red-300 hover:text-brand-red-300":
            !isActive,
        },
      )}
    >
      {page.icon}
      {page.name}
    </Link>
  );
};
