import { DevelopmentLogin } from "@/modules/auth/components/DevelopmentLogin";
import { authenticate } from "@/modules/auth/server";
import {
  REDIRECT_TO_SEARCH_PARAM,
  validateRedirectTo,
} from "@/modules/auth/utils/redirectTo";
import { Hero } from "@/modules/common/components/Hero";
import { LoginButtons } from "@/modules/common/components/LoginButtons";
import Note from "@/modules/common/components/Note";
import { UwuHero } from "@/modules/common/components/UwuHero";
import {
  SeasonalConfetti,
  SeasonalConfettiPlacement,
} from "@/modules/seasonal-events/components/SeasonalConfetti";
import { SeasonalViewportLayer } from "@/modules/seasonal-events/components/SeasonalViewportLayer";
import { getActiveSeasonalTheme } from "@/modules/seasonal-events/queries/getActiveSeasonalTheme";
import { getSeasonalThemeRootProps } from "@/modules/seasonal-events/utils/getSeasonalThemeRootProps";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { createLoader, parseAsString } from "nuqs/server";
import { authOptions } from "../modules/auth/server/auth";

export const metadata: Metadata = {
  description:
    "Sinister Administration Module (SAM) for the Star Citizen organization Sinister Incorporated",
};

const BANNED_ERROR = "UserBanned";

const loadSearchParams = createLoader({
  uwu: parseAsString,
  error: parseAsString,
  [REDIRECT_TO_SEARCH_PARAM]: parseAsString,
});

export default async function Page({ searchParams }: PageProps<"/">) {
  const searchParameters = await loadSearchParams(searchParams);
  const { uwu, error } = searchParameters;
  const redirectTo = validateRedirectTo(
    searchParameters[REDIRECT_TO_SEARCH_PARAM],
  );

  const authentication = await authenticate();
  // TODO: Instead of the static /dashboard, get redirect target from user settings once implemented
  if (authentication) redirect(redirectTo ?? "/app/dashboard");

  const activeProviders = authOptions.providers.map((provider) => provider.id);

  const seasonalThemeRootProps = getSeasonalThemeRootProps(
    await getActiveSeasonalTheme(),
    // `relative isolate` gives the confetti canvas its box and its own
    // stacking context, thus the canvas paints over the background of the
    // page and below everything the viewer reads.
    "relative isolate min-h-dvh flex-col flex justify-center items-center background-primary",
  );

  return (
    <div {...seasonalThemeRootProps}>
      <SeasonalConfetti placement={SeasonalConfettiPlacement.LoginPage} />

      <DevelopmentLogin redirectTo={redirectTo} />

      <main className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 py-8">
        {uwu ? <UwuHero /> : <Hero text="SAM" withGlitch />}

        <div className="flex max-w-xs flex-col gap-2">
          <LoginButtons
            activeProviders={activeProviders}
            redirectTo={redirectTo}
          />
        </div>

        {error && (
          <Note
            className="max-w-xs lg:p-4!"
            message={
              error === BANNED_ERROR
                ? "Dein Account wurde gesperrt."
                : "Beim Anmelden ist ein Fehler aufgetreten."
            }
          />
        )}
      </main>

      <Footer className="p-4" />

      <SeasonalViewportLayer />
    </div>
  );
}
