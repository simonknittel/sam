import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/penalty-points/utils/getNavigationItems";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Strafpunkte",
    default: "Strafpunkte",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default async function Layout({ children }: Props) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Strafpunkte" pages={pages} slug="penalty-points">
      {children}
    </DefaultLayout>
  );
}
