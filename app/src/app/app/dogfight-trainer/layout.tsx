import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

export const metadata: Metadata = {
  title: {
    template: "%s - Dogfight Trainer",
    default: "Dogfight Trainer",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default function Layout({ children }: Props) {
  const pages: Page[] = [
    {
      icon: <FaExternalLinkAlt />,
      title: "In einem neuen Tab öffnen",
      url: "/dogfight-trainer",
      external: true,
    },
  ];

  return (
    <DefaultLayout
      title="Dogfight Trainer"
      pages={pages}
      slug="dogfight-trainer"
    >
      {children}
    </DefaultLayout>
  );
}
