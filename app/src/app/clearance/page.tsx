import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { authenticate } from "@/modules/auth/server";
import { requireConfirmedEmailForPage } from "@/modules/auth/utils/emailConfirmation";
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
        <h1 className="mb-4 text-center text-xl text-sinister-red font-bold mx-8">
          <FaRegCheckCircle className="text-green-500 inline relative top-[-2px]" />{" "}
          Anmeldung erfolgreich
        </h1>

        <div className="flex flex-col gap-2 rounded-primary bg-neutral-800/50 p-8 mx-8">
          <p>
            Bitte melde dich bei Human Resources oder der Leitung um deinen
            Account freischalten zu lassen.
          </p>
        </div>
      </main>

      <Footer className="mt-4" />

      {showAdminEnabler && (
        <AdminEnabler
          enabled={(await cookies()).get("enable_admin")?.value === "1"}
        />
      )}
    </div>
  );
}
