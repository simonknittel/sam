import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { isNovuEnabled } from "@/modules/novu/utils";
import { Inbox } from "@novu/nextjs";
import { dark } from "@novu/react/themes";
import { createHmac } from "node:crypto";

export const Notifications = async () => {
  if (!(await isNovuEnabled())) return null;

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
    />
  );
};
