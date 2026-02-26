import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { EventsTile } from "@/modules/events/components/EventsTile";
import { Filters } from "@/modules/events/components/Filters";

export default async function Page({ searchParams }: PageProps<"/app/events">) {
  const authentication = await requireAuthenticationPage("/app/events");
  await authentication.authorizePage("event", "read");

  return (
    <SidebarLayout
      sidebar={<Filters />}
      childrenContainerClassName="@container/main"
    >
      <div className="@4xl/main:flex-1 max-w-[400px] @4xl/main:max-w-none @container/events">
        <SuspenseWithErrorBoundaryTile>
          <EventsTile searchParams={searchParams} />
        </SuspenseWithErrorBoundaryTile>
      </div>
    </SidebarLayout>
  );
}
