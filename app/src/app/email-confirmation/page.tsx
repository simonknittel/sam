import { requestEmailConfirmationAction } from "@/modules/auth/actions/requestEmailConfirmationAction";
import { AdminEnabler } from "@/modules/auth/components/AdminEnabler";
import { PageRefresher } from "@/modules/auth/components/PageRefresher";
import {
  RequestConfirmationEmailButton,
  RequestConfirmationEmailLink,
} from "@/modules/auth/components/RequestConfirmationEmail";
import { authenticate } from "@/modules/auth/server";
import { requiresEmailConfirmation } from "@/modules/auth/utils/emailConfirmation";
import { Link } from "@/modules/common/components/Link";
import type { NextjsSearchParams } from "@/modules/common/utils/searchParamsNextjsToURLSearchParams";
import { log } from "@/modules/logging";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RiInformationLine } from "react-icons/ri";

export const metadata: Metadata = {
  title: "E-Mail-Adresse und Datenschutzerklärung bestätigen",
};

interface Props {
  searchParams: NextjsSearchParams;
}

export default async function Page(props: Readonly<Props>) {
  const searchParams = await props.searchParams;
  const authentication = await authenticate();

  if (!authentication) {
    void log.info("Unauthenticated request to page", {
      requestPath: "/email-confirmation",
      reason: "No session",
    });

    redirect("/");
  }

  if ((await requiresEmailConfirmation(authentication.session)) === false)
    redirect("/clearance");

  if (authentication.session.user.emailVerified) redirect("/clearance");

  const newUser =
    (Array.isArray(searchParams["new-user"])
      ? searchParams["new-user"][0]
      : searchParams["new-user"]) === "true";

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

          <form action={requestEmailConfirmationAction}>
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
      {authentication.session.user.role === "admin" && (
        <AdminEnabler
          enabled={(await cookies()).get("enable_admin")?.value === "1"}
        />
      )}
    </div>
  );
}
