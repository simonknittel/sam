import type { Metadata } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Einstellungen",
    default: "Einstellungen",
  },
};

interface Props {
  readonly children?: ReactNode;
  readonly breadcrumbs?: ReactNode;
}

export default function Layout({ children, breadcrumbs }: Props) {
  return (
    <>
      <div className="mb-4 text-xl">{breadcrumbs}</div>

      {children}
    </>
  );
}
