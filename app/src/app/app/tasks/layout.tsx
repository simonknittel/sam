import { authenticate } from "@/modules/auth/server";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { CreateTaskButton } from "@/modules/tasks/components/CreateTask/CreateTaskButton";
import { getNavigationItems } from "@/modules/tasks/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Tasks",
    default: "Tasks",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/tasks">) {
  const [pages, authentication] = await Promise.all([
    getNavigationItems(),
    authenticate(),
  ]);

  const showCta =
    authentication && (await authentication.authorize("task", "create"));

  return (
    <DefaultLayout
      title="Tasks"
      pages={pages}
      cta={showCta ? <CreateTaskButton /> : undefined}
      slug="tasks"
    >
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
