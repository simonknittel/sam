import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { OverviewTab } from "@/modules/events/components/OverviewTab";
import { getEventById } from "@/modules/events/queries/getEventById";
import {
  DISCORD_PUBLISH_FAILED_PARAM,
  NOTIFICATIONS_FAILED_PARAM,
} from "@/modules/events/utils/eventConstraints";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/events/[id]">) => {
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
   * The create action redirects here with these flags when a part of its
   * work after the save failed — its own response has no room for a warning
   * (see DISCORD_PUBLISH_FAILED_PARAM). Only managers see them.
   */
  const query = await searchParams;
  const hasPublishFailedFlag = query[DISCORD_PUBLISH_FAILED_PARAM] === "1";
  const hasNotificationsFailedFlag = query[NOTIFICATIONS_FAILED_PARAM] === "1";
  /** Asked only when a flag is set: most visits have none */
  const canSeeWarnings =
    (hasPublishFailedFlag || hasNotificationsFailedFlag) &&
    (await isAllowedToManageEvent(event));
  const publishFailed = hasPublishFailedFlag && canSeeWarnings;
  const notificationsFailed = hasNotificationsFailedFlag && canSeeWarnings;
  const t = await getTranslations();

  return (
    <SuspenseWithErrorBoundaryTile>
      {publishFailed && (
        <Note
          type="warning"
          message="Das Event wurde erstellt, konnte aber nicht auf Discord veröffentlicht werden. Du kannst es in den Einstellungen erneut versuchen."
          className="mb-4 max-w-none!"
        />
      )}

      {notificationsFailed && (
        <Note
          type="warning"
          message={t("Common.notificationsFailed")}
          className="mb-4 max-w-none!"
        />
      )}

      <OverviewTab event={event} />
    </SuspenseWithErrorBoundaryTile>
  );
}
