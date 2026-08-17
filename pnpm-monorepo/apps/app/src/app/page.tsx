import { authenticate } from "@/modules/auth/server";
import { Hero } from "@/modules/common/components/Hero";
import { LoginButtons } from "@/modules/common/components/LoginButtons";
import Note from "@/modules/common/components/Note";
import { UwuHero } from "@/modules/common/components/UwuHero";
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
});

export default async function Page({ searchParams }: PageProps<"/">) {
  const authentication = await authenticate();
  // TODO: Instead of the static /dashboard, get redirect target from user settings once implemented
  if (authentication) redirect("/app/dashboard");

  const activeProviders = authOptions.providers.map((provider) => provider.id);

  const { uwu, error } = await loadSearchParams(searchParams);

  return (
    <div className="min-h-dvh flex-col flex justify-center items-center background-primary">
      <main className="w-full max-w-md py-8 flex flex-col justify-center items-center gap-4 flex-1">
        {uwu ? <UwuHero /> : <Hero text="SAM" withGlitch />}

        <div className="flex flex-col gap-2 max-w-xs">
          <LoginButtons activeProviders={activeProviders} />
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
    </div>
  );
}
