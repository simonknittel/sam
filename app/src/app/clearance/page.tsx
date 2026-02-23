import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { authenticate } from "@/modules/auth/server";
import { requireConfirmedEmailForPage } from "@/modules/auth/utils/emailConfirmation";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { ClearanceLogout } from "@/modules/iam/components/ClearanceLogout";
import { log } from "@/modules/logging";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";
import { cookies } from "next/headers";
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

  const showAdminEnabler = authentication.session.user.role === "admin";

  return (
    <div className="min-h-dvh flex justify-center items-center flex-col py-8 background-primary">
      <main className="w-full max-w-lg">
        <h1 className="mb-4 text-center text-xl text-sinister-red font-bold mx-8 font-mono uppercase">
          <FaRegCheckCircle className="text-green-500 inline relative top-[-2px]" />{" "}
          <ScrambleIn text="Anmeldung erfolgreich" />
        </h1>

        <div
          className="flex flex-col gap-2 rounded-primary bg-neutral-800/50 p-4 mx-4 beveled-br"
          style={{
            "--bevel-size": "16px",
          }}
        >
          <p>
            Bitte melde dich bei Human Resources oder der Leitung um deinen
            Account freischalten zu lassen.
          </p>
        </div>

        <details>
          <summary className="mt-4 text-center text-neutral-500 text-xs hover:text-interaction-500 focus-visible:text-interaction-500 active:text-interaction-300 hover:underline focus-visible:underline active:underline cursor-pointer">
            Benutzerdetails anzeigen
          </summary>

          <div className="mt-4 flex flex-col gap-4 items-center px-4">
            <section className="flex flex-col gap-2 text-neutral-500 text-xs max-w-full">
              <div>
                <p className="font-bold mb-1">Discord</p>

                <div className="flex gap-1">
                  <p className="flex-none w-28">ID:</p>
                  <p
                    className="flex-1 truncate"
                    title={authentication.session.discordId}
                  >
                    {authentication.session.discordId}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold mb-1">Benutzer</p>

                <div className="flex gap-1">
                  <p className="flex-none w-28">User ID:</p>

                  <p
                    className="flex-1 truncate"
                    title={authentication.session.user.id}
                  >
                    {authentication.session.user.id}
                  </p>
                </div>

                <div className="flex gap-1">
                  <p className="flex-none w-28">E-Mail-Adresse:</p>
                  <p
                    className="flex-1 truncate"
                    title={authentication.session.user.email || undefined}
                  >
                    {authentication.session.user.email}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold mb-1">Citizen</p>

                {authentication.session.entity ? (
                  <div className="flex gap-1">
                    <p className="flex-none w-28">Internal ID:</p>
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

      <div className="h-[1px] bg-neutral-700 mt-4 w-2" />

      <Footer className="mt-4" />

      {showAdminEnabler && (
        <AdminEnabler
          enabled={(await cookies()).get("enable_admin")?.value === "1"}
        />
      )}
    </div>
  );
}
