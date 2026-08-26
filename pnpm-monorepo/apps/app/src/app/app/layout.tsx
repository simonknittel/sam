import { AppsContextProvider } from "@/modules/apps/components/AppsContext";
import { getAppFavoriteKeys } from "@/modules/apps/utils/queries/getAppFavoriteKeys";
import { getAppLinks } from "@/modules/apps/utils/queries/getAppLinks";
import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { SessionProviderContainer } from "@/modules/auth/components/SessionProviderContainer";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { getAssumedUserLabel } from "@/modules/auth/utils/getAssumedUserLabel";
import { hasAnyReadableFlow } from "@/modules/career/queries/getMyReadableFlows";
import { getUnseenChangelogEntryKeys } from "@/modules/changelog/queries/getUnseenChangelogEntryKeys";
import { CHANGELOG_APP_SLUG } from "@/modules/changelog/utils/CHANGELOG_APP_SLUG";
import { CreateContextProvider } from "@/modules/common/components/CreateContext";
import { NewReleaseToast } from "@/modules/common/components/NewReleaseToast";
import QueryClientProviderContainer from "@/modules/common/components/QueryClientProviderContainer";
import { ServiceWorkerLoader } from "@/modules/common/components/ServiceWorkerLoader";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { OnSiteNotificationsProvider } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { getUnreadOnSiteNotificationCount } from "@/modules/notifications/utils/queries/getUnreadOnSiteNotificationCount";
import { OnboardingProvider } from "@/modules/onboarding/components/OnboardingProvider";
import { OnboardingTour } from "@/modules/onboarding/components/OnboardingTour";
import { getOnboardingState } from "@/modules/onboarding/utils/queries/getOnboardingState";
import { ChannelsProvider } from "@/modules/pusher/components/ChannelsContext";
import { RolesContextProvider } from "@/modules/roles/components/RolesContext";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { CmdKProvider } from "@/modules/shell/components/CmdK/CmdKContext";
import { MobileActionBarLoader } from "@/modules/shell/components/Sidebar/MobileActionBarLoader";
import { SkipToContentLink } from "@/modules/shell/components/SkipToContentLink";
import { TopBar } from "@/modules/shell/components/TopBar";
import { getOpenWikiReportCount } from "@/modules/wiki/queries/getOpenWikiReportCount";
import { TRPCReactProvider } from "@/trpc/react";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const [
    authentication,
    disableAlgolia,
    apps,
    favoriteAppKeys,
    visibleRoles,
    changelogUnseenKeys,
    openWikiReportCount,
    unreadOnSiteNotificationCount,
    canReadCareer,
    onboardingState,
  ] = await Promise.all([
    requireAuthenticationPage(),
    getUnleashFlag(UNLEASH_FLAG.DisableAlgolia),
    getAppLinks(),
    getAppFavoriteKeys(),
    getVisibleRoles(),
    getUnseenChangelogEntryKeys(),
    getOpenWikiReportCount(),
    getUnreadOnSiteNotificationCount(),
    hasAnyReadableFlow(),
    getOnboardingState(),
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
                      <SkipToContentLink />

                      <AppsContextProvider
                        apps={apps}
                        appDotBadgeCounts={{
                          [CHANGELOG_APP_SLUG]: changelogUnseenKeys.size,
                          wiki: openWikiReportCount,
                        }}
                        favoriteAppKeys={[...favoriteAppKeys]}
                      >
                        <OnSiteNotificationsProvider
                          initialUnreadCount={unreadOnSiteNotificationCount}
                        >
                          <OnboardingProvider initialState={onboardingState}>
                            <CreateContextProvider>
                              <CmdKProvider
                                disableAlgolia={disableAlgolia}
                                canReadCareer={canReadCareer}
                              >
                                <TopBar />
                                <MobileActionBarLoader />
                              </CmdKProvider>

                              <div className="pt-12 lg:pt-28 pb-16 lg:pb-0 min-h-dvh">
                                {children}
                              </div>

                              <OnboardingTour />
                            </CreateContextProvider>
                          </OnboardingProvider>
                        </OnSiteNotificationsProvider>
                      </AppsContextProvider>
                    </div>

                    {(authentication.session.user.role === "admin" ||
                      authentication.session.assumedByAdmin) && (
                      <AdminEnabler
                        enabled={
                          (await cookies()).get("enable_admin")?.value === "1"
                        }
                        assumedUserLabel={getAssumedUserLabel(
                          authentication.session,
                        )}
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
