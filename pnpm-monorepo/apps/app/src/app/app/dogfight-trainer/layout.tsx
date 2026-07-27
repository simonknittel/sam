import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import type { Metadata } from "next";
import { FaExternalLinkAlt } from "react-icons/fa";

export const metadata: Metadata = {
  title: {
    template: "%s - Dogfight Trainer",
    default: "Dogfight Trainer",
  },
};

export default function Layout({
  children,
}: LayoutProps<"/app/dogfight-trainer">) {
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
