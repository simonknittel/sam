import { AppsContextProvider } from "@/modules/apps/components/AppsContext";
import { getAppLinks } from "@/modules/apps/utils/queries";
import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { SessionProviderContainer } from "@/modules/auth/components/SessionProviderContainer";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { CreateContextProvider } from "@/modules/common/components/CreateContext";
import ImpersonationBannerContainer from "@/modules/common/components/ImpersonationBannerContainer";
import { NewReleaseToast } from "@/modules/common/components/NewReleaseToast";
import QueryClientProviderContainer from "@/modules/common/components/QueryClientProviderContainer";
import { ServiceWorkerLoader } from "@/modules/common/components/ServiceWorkerLoader";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { ChannelsProvider } from "@/modules/pusher/components/ChannelsContext";
import { RolesContextProvider } from "@/modules/roles/components/RolesContext";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { CmdKProvider } from "@/modules/shell/components/CmdK/CmdKContext";
import { MobileActionBarLoader } from "@/modules/shell/components/Sidebar/MobileActionBarLoader";
import { TopBar } from "@/modules/shell/components/TopBar";
import { TRPCReactProvider } from "@/trpc/react";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const [authentication, disableAlgolia, apps, visibleRoles] =
    await Promise.all([
      requireAuthenticationPage(),
      getUnleashFlag(UNLEASH_FLAG.DisableAlgolia),
      getAppLinks(),
      getVisibleRoles(),
    ]);

  return (
    <>
      <SessionProviderContainer session={authentication.session}>
        <NuqsAdapter>
          <QueryClientProviderContainer>
            <TRPCReactProvider>
              <ChannelsProvider userId={authentication.session.user.id}>
                <NextIntlClientProvider>
                  <RolesContextProvider roles={visibleRoles}>
                    <div className="min-h-dvh background-primary">
                      <AppsContextProvider apps={apps}>
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

                    <NewReleaseToast />
                  </RolesContextProvider>
                </NextIntlClientProvider>
              </ChannelsProvider>
            </TRPCReactProvider>
          </QueryClientProviderContainer>
        </NuqsAdapter>
      </SessionProviderContainer>

      <ServiceWorkerLoader />
    </>
  );
}
