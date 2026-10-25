import { DiscordRelogin } from "@/modules/auth/components/DiscordRelogin";
import { authenticate } from "@/modules/auth/server";
import { requireConfirmedEmailForPage } from "@/modules/auth/utils/emailConfirmation";
import { isMissingTwoFactorAuthenticationOfSession } from "@/modules/auth/utils/twoFactorAuthentication";
import { ClearanceLogout } from "@/modules/iam/components/ClearanceLogout";
import { log } from "@/modules/logging";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { RiShieldKeyholeLine } from "react-icons/ri";

export const metadata: Metadata = {
  title: "Zwei-Faktor-Authentifizierung erforderlich",
};

/** "Die Multi-Faktor-Authentifizierung einrichten" in the help centre of Discord */
const DISCORD_TWO_FACTOR_HELP_URL =
  "https://support.discord.com/hc/de/articles/219576828";

export default async function Page() {
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthenticated request to page", {
      requestPath: "/two-factor-authentication",
      reason: "No session",
    });

    redirect("/");
  }

  await requireConfirmedEmailForPage(authentication.session);

  if (!(await authentication.authorize("login", "manage")))
    redirect("/clearance");

  if (!isMissingTwoFactorAuthenticationOfSession(authentication.session))
    redirect("/app");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center background-primary py-8">
      <main className="w-full max-w-lg">
        <h1 className="mx-8 mb-4 text-center text-xl font-bold text-brand-red-500">
          <RiShieldKeyholeLine className="inline align-text-bottom text-2xl text-sky-500" />{" "}
          Zwei-Faktor-Authentifizierung erforderlich
        </h1>

        <div className="mx-4 flex flex-col gap-4 corners-secondary bg-neutral-800/50 p-4">
          <p>
            Dein Account hat Berechtigungen, die besonders geschützt werden
            müssen. Dafür muss dein Discord-Account die
            Zwei-Faktor-Authentifizierung nutzen.
          </p>

          <p>
            {authentication.session.discordTwoFactorEnabled === false
              ? "Bei deiner letzten Anmeldung hat Discord gemeldet, dass die Zwei-Faktor-Authentifizierung für deinen Account nicht aktiv ist."
              : "Wir haben die Zwei-Faktor-Authentifizierung deines Discord-Accounts noch nicht geprüft."}
          </p>

          <ol className="list-inside list-decimal">
            <li>
              Aktiviere die Zwei-Faktor-Authentifizierung in Discord (
              <a
                href={DISCORD_TWO_FACTOR_HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="text-brand-red-500 hover:text-brand-red-300 hover:underline focus-visible:text-brand-red-300 focus-visible:underline active:text-brand-red-700"
              >
                Anleitung von Discord
              </a>
              ).
            </li>

            <li>Melde dich danach erneut mit Discord an.</li>
          </ol>

          <div className="flex flex-wrap justify-center gap-2">
            <DiscordRelogin />
            <ClearanceLogout />
          </div>
        </div>
      </main>

      <Footer className="mt-4" />
    </div>
  );
}
