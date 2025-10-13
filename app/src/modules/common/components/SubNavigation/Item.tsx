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
  };
}

export const Item = ({ page }: Props) => {
  const pathname = usePathname();

  const isActive = page.path === pathname;

  return (
    <Link
      key={page.path}
      href={page.path}
      className={clsx(
        "first:rounded-l border-[1px] border-brand-red-700 last:rounded-r h-8 flex items-center justify-center px-3 gap-2 uppercase",
        {
          "bg-brand-red-500 text-white": isActive,
          "text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300":
            !isActive,
        },
      )}
    >
      {page.icon}
      {page.name}
    </Link>
  );
};
