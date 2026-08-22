import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { OverviewTab } from "@/modules/events/components/OverviewTab";
import { getEventById } from "@/modules/events/queries/getEventById";
import { DISCORD_PUBLISH_FAILED_PARAM } from "@/modules/events/utils/eventConstraints";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const event = await getEventById((await props.params).id);
    if (!event) notFound();

    return {
      title: `${event.name}`,
    };
  },
);

export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/events/[id]">) {
  const authentication = await requireAuthenticationPage("/app/events/[id]");
  await authentication.authorizePage("event", "read");

  const event = await getEventById((await params).id);
  if (!event) notFound();

  /**
   * The create action redirects here with this flag when the new event could
   * not be published to Discord — its own response has no room for a warning
   * (see DISCORD_PUBLISH_FAILED_PARAM). Only managers can act on it.
   */
  const publishFailed =
    (await searchParams)[DISCORD_PUBLISH_FAILED_PARAM] === "1" &&
    (await isAllowedToManageEvent(event));

  return (
    <SuspenseWithErrorBoundaryTile>
      {publishFailed && (
        <Note
          type="warning"
          message="Das Event wurde erstellt, konnte aber nicht auf Discord veröffentlicht werden. Du kannst es in den Einstellungen erneut versuchen."
          className="mb-4 max-w-none!"
        />
      )}

      <OverviewTab event={event} />
    </SuspenseWithErrorBoundaryTile>
  );
}
