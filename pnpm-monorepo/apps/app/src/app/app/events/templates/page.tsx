import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { EventTemplatesFilters } from "@/modules/event-templates/components/EventTemplatesFilters";
import { EventTemplatesTable } from "@/modules/event-templates/components/EventTemplatesTable";
import { hasEventTemplatesAccess } from "@/modules/event-templates/queries/hasEventTemplatesAccess";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";

export const metadata: Metadata = {
  title: "Vorlagen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/events/templates">) {
  await requireAuthenticationPage("/app/events/templates");

  /**
   * The section is reachable for everyone who may create events, manages
   * them, or has at least one template shared with them.
   */
  if (!(await hasEventTemplatesAccess())) forbidden();

  return (
    <SidebarLayout sidebar={<EventTemplatesFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <EventTemplatesTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
