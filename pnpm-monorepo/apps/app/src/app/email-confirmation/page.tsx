import { requestEmailConfirmationAction } from "@/modules/auth/actions/requestEmailConfirmationAction";
import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { PageRefresher } from "@/modules/auth/components/PageRefresher";
import {
  RequestConfirmationEmailButton,
  RequestConfirmationEmailLink,
} from "@/modules/auth/components/RequestConfirmationEmail";
import { authenticate } from "@/modules/auth/server";
import { requiresEmailConfirmation } from "@/modules/auth/utils/emailConfirmation";
import { getAssumedUserLabel } from "@/modules/auth/utils/getAssumedUserLabel";
import { Link } from "@/modules/common/components/Link";
import { log } from "@/modules/logging";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createLoader, parseAsBoolean } from "nuqs/server";
import { RiInformationLine } from "react-icons/ri";

export const metadata: Metadata = {
  title: "E-Mail-Adresse und Datenschutzerklärung bestätigen",
};

const loadSearchParams = createLoader({
  "new-user": parseAsBoolean.withDefault(false),
});

export default async function Page({
  searchParams,
}: PageProps<"/email-confirmation">) {
  const { "new-user": newUser } = await loadSearchParams(searchParams);
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthenticated request to page", {
      requestPath: "/email-confirmation",
      reason: "No session",
    });

    redirect("/");
  }

  if ((await requiresEmailConfirmation(authentication.session)) === false)
    redirect("/clearance");

  if (authentication.session.user.emailVerified) redirect("/clearance");

  const formAction = async (formData: FormData) => {
    "use server";
    await requestEmailConfirmationAction(formData);
  };

  return (
    <div className="min-h-dvh flex justify-center items-center flex-col py-8 background-primary">
      <main className="w-full max-w-3xl">
        <h1 className="mb-4 text-center text-xl text-sinister-red font-bold mx-8">
          <RiInformationLine className="text-sky-500 text-2xl inline align-text-bottom" />{" "}
          E-Mail-Adresse und Datenschutzerklärung bestätigen
        </h1>

        <div className="flex flex-col gap-2 rounded-primary bg-neutral-800/50  p-8 mx-8">
          <p>
            Um fortfahren zu können musst du deine E-Mail-Adresse (
            <i>{authentication.session.user.email}</i>) und die{" "}
            <Link href="/privacy" className="underline">
              Datenschutzerklärung
            </Link>{" "}
            bestätigen.
          </p>

          <form action={formAction}>
            {newUser ? (
              <p className="mb-3 font-bold">
                Zur Bestätigung haben wir dir eine E-Mail geschickt.
              </p>
            ) : (
              <div className="flex justify-center mt-2 mb-3">
                <RequestConfirmationEmailButton>
                  Bestätigungs-E-Mail verschicken
                </RequestConfirmationEmailButton>
              </div>
            )}

            <p className="text-neutral-500">
              Falls die E-Mail nicht angekommen ist,{" "}
              <RequestConfirmationEmailLink>
                klick hier
              </RequestConfirmationEmailLink>{" "}
              um es erneut zu versuchen, oder melde dich bei{" "}
              <Link
                href="mailto:info@sinister-incorporated.de"
                className="underline"
              >
                info@sinister-incorporated.de
              </Link>
              .
            </p>
          </form>
        </div>
      </main>
      <Footer className="mt-4" />
      <PageRefresher />
      {(authentication.session.user.role === "admin" ||
        authentication.session.assumedByAdmin) && (
        <AdminEnabler
          enabled={(await cookies()).get("enable_admin")?.value === "1"}
          assumedUserLabel={getAssumedUserLabel(authentication.session)}
        />
      )}
    </div>
  );
}
