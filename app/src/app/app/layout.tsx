import { env } from "@/env";
import { AppsContextProvider } from "@/modules/apps/components/AppsContext";
import { getAppLinks, getExternalApps } from "@/modules/apps/utils/queries";
import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { SessionProviderContainer } from "@/modules/auth/components/SessionProviderContainer";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { CreateContextProvider } from "@/modules/common/components/CreateContext";
import ImpersonationBannerContainer from "@/modules/common/components/ImpersonationBannerContainer";
import QueryClientProviderContainer from "@/modules/common/components/QueryClientProviderContainer";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { BeamsProvider } from "@/modules/pusher/components/BeamsContext";
import { ChannelsProvider } from "@/modules/pusher/components/ChannelsContext";
import { CmdKProvider } from "@/modules/shell/components/CmdK/CmdKContext";
import { MobileActionBarLoader } from "@/modules/shell/components/Sidebar/MobileActionBarLoader";
import { TopBar } from "@/modules/shell/components/TopBar";
import { TRPCReactProvider } from "@/trpc/react";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default async function AppLayout({ children }: Readonly<Props>) {
  const [authentication, disableAlgolia, apps, externalApps] =
    await Promise.all([
      requireAuthenticationPage(),
      getUnleashFlag(UNLEASH_FLAG.DisableAlgolia),
      getAppLinks(),
      getExternalApps(),
    ]);

  return (
    <SessionProviderContainer session={authentication.session}>
      <NuqsAdapter>
        <QueryClientProviderContainer>
          <TRPCReactProvider>
            <ChannelsProvider userId={authentication.session.user.id}>
              <BeamsProvider
                instanceId={env.PUSHER_BEAMS_INSTANCE_ID}
                userId={authentication.session.user.id}
              >
                <NextIntlClientProvider>
                  <div className="min-h-dvh background-primary">
                    <AppsContextProvider
                      apps={apps}
                      externalApps={externalApps}
                    >
                      <CreateContextProvider>
                        <CmdKProvider disableAlgolia={disableAlgolia}>
                          <TopBar />
                          <MobileActionBarLoader />
                        </CmdKProvider>

                        <div className="pt-12 lg:pt-[104px] pb-[64px] lg:pb-0 min-h-dvh">
                          {children}
                        </div>
                      </CreateContextProvider>
                    </AppsContextProvider>
                  </div>

                  <Suspense>
                    <ImpersonationBannerContainer />
                  </Suspense>

                  {authentication.session.user.role === "admin" && (
                    <AdminEnabler
                      enabled={
                        (await cookies()).get("enable_admin")?.value === "1"
                      }
                    />
                  )}
                </NextIntlClientProvider>
              </BeamsProvider>
            </ChannelsProvider>
          </TRPCReactProvider>
        </QueryClientProviderContainer>
      </NuqsAdapter>
    </SessionProviderContainer>
  );
}
