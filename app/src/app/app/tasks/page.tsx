import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Filters } from "@/modules/tasks/components/Filters";
import { TasksTile } from "@/modules/tasks/components/TasksTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks",
};

export default async function Page({ searchParams }: PageProps<"/app/tasks">) {
  const authentication = await requireAuthenticationPage("/app/tasks");
  await authentication.authorizePage("task", "read");

  return (
    <SidebarLayout sidebar={<Filters />}>
      <SuspenseWithErrorBoundaryTile>
        <TasksTile searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
