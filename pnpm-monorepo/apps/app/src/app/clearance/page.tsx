import { AdminToolbar } from "@/modules/admin-toolbar/components/AdminToolbar";
import { authenticate } from "@/modules/auth/server";
import { requireConfirmedEmailForPage } from "@/modules/auth/utils/emailConfirmation";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { ClearanceLogout } from "@/modules/iam/components/ClearanceLogout";
import { log } from "@/modules/logging";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { FaRegCheckCircle } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Freigabe",
};

export default async function Page() {
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthenticated request to page", {
      requestPath: "/clearance",
      reason: "No session",
    });

    redirect("/");
  }

  await requireConfirmedEmailForPage(authentication.session);

  if (await authentication.authorize("login", "manage")) redirect("/app");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center background-primary py-8">
      <main className="w-full max-w-lg">
        <h1 className="text-sinister-red mx-8 mb-4 text-center font-mono text-xl font-bold uppercase">
          <FaRegCheckCircle className="relative -top-0.5 inline text-green-500" />{" "}
          <ScrambleIn text="Anmeldung erfolgreich" />
        </h1>

        <div className="mx-4 flex flex-col gap-2 corners-secondary bg-neutral-800/50 p-4">
          <p>
            Bitte melde dich bei Human Resources oder der Leitung um deinen
            Account freischalten zu lassen.
          </p>
        </div>

        <details>
          <summary className="mt-4 cursor-pointer text-center text-xs text-neutral-500 hover:text-interaction-500 hover:underline focus-visible:text-interaction-500 focus-visible:underline active:text-interaction-300 active:underline">
            Benutzerdetails anzeigen
          </summary>

          <div className="mt-4 flex flex-col items-center gap-4 px-4">
            <section className="flex max-w-full flex-col gap-2 text-xs text-neutral-500">
              <div>
                <p className="mb-1 font-bold">Discord</p>

                <div className="flex gap-1">
                  <p className="w-28 flex-none">ID:</p>
                  <p
                    className="flex-1 truncate"
                    title={authentication.session.discordId ?? undefined}
                  >
                    {authentication.session.discordId}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1 font-bold">Benutzer</p>

                <div className="flex gap-1">
                  <p className="w-28 flex-none">User ID:</p>

                  <p
                    className="flex-1 truncate"
                    title={authentication.session.user.id}
                  >
                    {authentication.session.user.id}
                  </p>
                </div>

                <div className="flex gap-1">
                  <p className="w-28 flex-none">E-Mail-Adresse:</p>
                  <p
                    className="flex-1 truncate"
                    title={authentication.session.user.email || undefined}
                  >
                    {authentication.session.user.email}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1 font-bold">Citizen</p>

                {authentication.session.entity ? (
                  <div className="flex gap-1">
                    <p className="w-28 flex-none">Internal ID:</p>
                    <p
                      className="flex-1 truncate"
                      title={authentication.session.entity.id}
                    >
                      {authentication.session.entity.id}
                    </p>
                  </div>
                ) : (
                  "-"
                )}
              </div>
            </section>

            <ClearanceLogout />
          </div>
        </details>
      </main>

      <div className="mt-4 h-px w-2 bg-neutral-700" />

      <Footer className="mt-4" />

      <AdminToolbar />
    </div>
  );
}
