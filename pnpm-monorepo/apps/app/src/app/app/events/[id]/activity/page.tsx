import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { ActivityTab } from "@/modules/events/components/ActivityTab";
import { getEventById } from "@/modules/events/queries/getEventById";
import { EventSource } from "@sam-monorepo/database/client";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const event = await getEventById((await props.params).id);
    if (!event) notFound();

    return {
      title: `Aktivität - ${event.name}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/events/[id]/activity">) {
  const authentication = await requireAuthenticationPage(
    "/app/events/[id]/activity",
  );
  await authentication.authorizePage("event", "read");

  const eventId = (await params).id;
  const event = await getEventById(eventId);
  if (!event) notFound();
  if (event.source !== EventSource.APP) notFound();

  return (
    <SuspenseWithErrorBoundaryTile>
      <ActivityTab event={event} />
    </SuspenseWithErrorBoundaryTile>
  );
}
