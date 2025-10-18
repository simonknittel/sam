import { authenticate } from "@/modules/auth/server";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/iam/utils/getNavigationItems";
import { CreateRoleButton } from "@/modules/roles/components/CreateRole/CreateRoleButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - IAM",
    default: "IAM",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/iam">) {
  const [pages, authentication] = await Promise.all([
    getNavigationItems(),
    authenticate(),
  ]);

  const showCreateRoleButton =
    authentication && authentication.authorize("role", "manage");

  return (
    <DefaultLayout
      title="IAM"
      pages={pages}
      cta={showCreateRoleButton ? <CreateRoleButton /> : undefined}
      slug="iam"
    >
      {children}
    </DefaultLayout>
  );
}
