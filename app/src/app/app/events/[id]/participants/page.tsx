import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { searchParamsNextjsToURLSearchParams } from "@/modules/common/utils/searchParamsNextjsToURLSearchParams";
import { ParticipantsTab } from "@/modules/events/components/ParticipantsTab";
import { Template } from "@/modules/events/components/Template";
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
      title: `Teilnehmer - ${event.name} - Event`,
    };
  },
);

export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/events/[id]/participants">) {
  const authentication = await requireAuthenticationPage("/app/events/[id]");
  await authentication.authorizePage("event", "read");

  const eventId = (await params).id;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const urlSearchParams =
    await searchParamsNextjsToURLSearchParams(searchParams);

  return (
    <Template event={event}>
      <SuspenseWithErrorBoundaryTile>
        <ParticipantsTab event={event} urlSearchParams={urlSearchParams} />
      </SuspenseWithErrorBoundaryTile>
    </Template>
  );
}
