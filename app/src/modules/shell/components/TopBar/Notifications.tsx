import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { Inbox } from "@novu/nextjs";
import { dark } from "@novu/react/themes";
import { createHmac } from "node:crypto";

export const Notifications = async () => {
  if (!(await getUnleashFlag(UNLEASH_FLAG.EnableNotificationsRework)))
    return null;

  const authentication = await authenticate();
  if (!authentication || !authentication.session.entity) return null;

  const hmacHash = createHmac("sha256", env.NOVU_SECRET_KEY!)
    .update(authentication.session.entity.id)
    .digest("hex");

  return (
    <Inbox
      applicationIdentifier={env.NOVU_APPLICATION_IDENTIFIER!}
      subscriberId={authentication.session.entity.id}
      subscriberHash={hmacHash}
      backendUrl={env.NOVU_SERVER_URL}
      socketUrl={env.NOVU_SOCKET_URL}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#c22424",
        },
        elements: {
          popoverTrigger: "h-12 rounded-none",
          bellDot: "bg-green-500",
          preferencesContainer: "pr-3",
        },
      }}
      localization={{
        locale: "de-DE",
      }}
      preferenceGroups={[
        {
          name: "Changelog",
          filter: { tags: ["Changelog"] },
        },
        {
          name: "Events",
          filter: { tags: ["Events"] },
        },
        {
          name: "Karriere",
          filter: { tags: ["Karriere"] },
        },
        {
          name: "SINcome",
          filter: { tags: ["SINcome"] },
        },
        {
          name: "SILC",
          filter: { tags: ["SILC"] },
        },
      ]}
      tabs={[
        {
          label: "Alle",
          filter: { tags: [] },
        },
        {
          label: "Changelog",
          filter: { tags: ["Changelog"] },
        },
        {
          label: "Events",
          filter: { tags: ["Events"] },
        },
        {
          label: "Karriere",
          filter: { tags: ["Karriere"] },
        },
        {
          label: "SINcome",
          filter: { tags: ["SINcome"] },
        },
        {
          label: "SILC",
          filter: { tags: ["SILC"] },
        },
      ]}
    />
  );
};
