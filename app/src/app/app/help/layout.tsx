import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/help/utils/getNavigationItems";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Hilfe",
    default: "Hilfe",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default async function Layout({ children }: Props) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Hilfe" slug="help" pages={pages}>
      {children}
    </DefaultLayout>
  );
}
