import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/documents/utils/getNavigationItems";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Dokumente",
    default: "Dokumente",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default async function Layout({ children }: Props) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Dokumente" slug="documents" pages={pages}>
      {children}
    </DefaultLayout>
  );
}
