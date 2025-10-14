import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { FleetTab } from "@/modules/events/components/FleetTab";
import { getEventById } from "@/modules/events/queries";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const event = await getEventById((await props.params).id);
    if (!event) notFound();

    return {
      title: `Flotte - ${event.name}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/events/[id]/fleet">) {
  const authentication = await requireAuthenticationPage("/app/events/[id]");
  await authentication.authorizePage("event", "read");
  await authentication.authorizePage("orgFleet", "read");

  const eventId = (await params).id;
  const event = await getEventById(eventId);
  if (!event) notFound();

  return (
    <SuspenseWithErrorBoundaryTile>
      <FleetTab event={event} />
    </SuspenseWithErrorBoundaryTile>
  );
}
