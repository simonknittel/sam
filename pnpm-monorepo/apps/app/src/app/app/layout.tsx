import { AdminToolbar } from "@/modules/admin-toolbar/components/AdminToolbar";
import { AppsContextProvider } from "@/modules/apps/components/AppsContext";
import { addCountsByAppSlug } from "@/modules/apps/utils/addCountsByAppSlug";
import { getAppFavoriteKeys } from "@/modules/apps/utils/queries/getAppFavoriteKeys";
import { getAppLinks } from "@/modules/apps/utils/queries/getAppLinks";
import { SessionProviderContainer } from "@/modules/auth/components/SessionProviderContainer";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import { hasAnyReadableFlow } from "@/modules/career/queries/getMyReadableFlows";
import { BirthdayCitizensProvider } from "@/modules/citizen/components/BirthdayCitizensProvider";
import { getCitizenIdsWithBirthdayToday } from "@/modules/citizen/queries/getCitizenIdsWithBirthdayToday";
import { CreateContextProvider } from "@/modules/common/components/CreateContext";
import { NewReleaseToast } from "@/modules/common/components/NewReleaseToast";
import { OnSiteNotificationsProvider } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { getUnreadOnSiteNotificationCount } from "@/modules/notifications/utils/queries/getUnreadOnSiteNotificationCount";
import { OnboardingPopoverOpener } from "@/modules/onboarding/components/OnboardingPopoverOpener";
import { OnboardingProvider } from "@/modules/onboarding/components/OnboardingProvider";
import { OnboardingTour } from "@/modules/onboarding/components/OnboardingTour";
import { getOnboardingState } from "@/modules/onboarding/utils/queries/getOnboardingState";
import { ChannelsProvider } from "@/modules/pusher/components/ChannelsContext";
import { getNewItemCountsByAppSlug } from "@/modules/read-markers/queries/getNewItemCountsByAppSlug";
import { RolesContextProvider } from "@/modules/roles/components/RolesContext";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { SeasonalViewportLayer } from "@/modules/seasonal-events/components/SeasonalViewportLayer";
import { getActiveSeasonalTheme } from "@/modules/seasonal-events/queries/getActiveSeasonalTheme";
import { getSeasonalThemeRootProps } from "@/modules/seasonal-events/utils/getSeasonalThemeRootProps";
import { CmdKProvider } from "@/modules/shell/components/CmdK/CmdKContext";
import { MobileActionBarLoader } from "@/modules/shell/components/Sidebar/MobileActionBarLoader";
import { SkipToContentLink } from "@/modules/shell/components/SkipToContentLink";
import { TopBar } from "@/modules/shell/components/TopBar";
import { getOpenWikiReportCount } from "@/modules/wiki/queries/getOpenWikiReportCount";
import { TRPCReactProvider } from "@/trpc/react";
import { NextIntlClientProvider } from "next-intl";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const [
    authentication,
    apps,
    favoriteAppKeys,
    visibleRoles,
    openWikiReportCount,
    unreadOnSiteNotificationCount,
    canReadCareer,
    onboardingState,
    birthdayCitizenIds,
    seasonalTheme,
    newItemCountsByAppSlug,
  ] = await Promise.all([
    requireAuthenticationPage(),
    getAppLinks(),
    getAppFavoriteKeys(),
    getVisibleRoles(),
    getOpenWikiReportCount(),
    getUnreadOnSiteNotificationCount(),
    hasAnyReadableFlow(),
    getOnboardingState(),
    getCitizenIdsWithBirthdayToday(),
    getActiveSeasonalTheme(),
    getNewItemCountsByAppSlug(),
  ]);

  const adminModeActive = await isAdminModeActive(authentication.session);

  const seasonalThemeRootProps = getSeasonalThemeRootProps(
    seasonalTheme,
    "min-h-dvh background-primary",
  );

  return (
    <SessionProviderContainer
      session={authentication.session}
      adminModeActive={adminModeActive}
    >
      <NuqsAdapter>
        <TRPCReactProvider>
          <ChannelsProvider userId={authentication.session.user.id}>
            <NextIntlClientProvider>
              <RolesContextProvider roles={visibleRoles}>
                <BirthdayCitizensProvider citizenIds={birthdayCitizenIds}>
                  <div {...seasonalThemeRootProps}>
                    <SkipToContentLink />

                    <AppsContextProvider
                      apps={apps}
                      appDotBadgeCounts={addCountsByAppSlug(
                        { wiki: openWikiReportCount },
                        newItemCountsByAppSlug,
                      )}
                      favoriteAppKeys={[...favoriteAppKeys]}
                    >
                      <OnSiteNotificationsProvider
                        initialUnreadCount={unreadOnSiteNotificationCount}
                      >
                        <OnboardingProvider initialState={onboardingState}>
                          <CreateContextProvider>
                            <CmdKProvider canReadCareer={canReadCareer}>
                              <TopBar />
                              <MobileActionBarLoader />
                            </CmdKProvider>

                            <div className="min-h-dvh pt-12 pb-16 lg:pt-28 lg:pb-0">
                              {children}
                            </div>

                            <SeasonalViewportLayer />

                            <OnboardingTour />

                            <Suspense>
                              <OnboardingPopoverOpener />
                            </Suspense>
                          </CreateContextProvider>
                        </OnboardingProvider>
                      </OnSiteNotificationsProvider>
                    </AppsContextProvider>
                  </div>

                  <AdminToolbar />

                  <NewReleaseToast />
                </BirthdayCitizensProvider>
              </RolesContextProvider>
            </NextIntlClientProvider>
          </ChannelsProvider>
        </TRPCReactProvider>
      </NuqsAdapter>
    </SessionProviderContainer>
  );
}
