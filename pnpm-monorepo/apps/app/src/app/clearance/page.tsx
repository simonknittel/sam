import { AdminToolbar } from "@/modules/admin-toolbar/components/AdminToolbar";
import { authenticate } from "@/modules/auth/server";
import { requireConfirmedEmailForPage } from "@/modules/auth/utils/emailConfirmation";
import { requireTwoFactorAuthenticationForPage } from "@/modules/auth/utils/twoFactorAuthentication";
import { ClearanceLogout } from "@/modules/iam/components/ClearanceLogout";
import { HumanResourcesPopover } from "@/modules/iam/components/HumanResourcesPopover";
import { getHumanResourcesContacts } from "@/modules/iam/queries/getHumanResourcesContacts";
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

  /**
   * Before the clearance: an admin without `login;manage` gets it from admin
   * mode, and the admin toolbar of this page needs the two-factor
   * authentication
   */
  requireTwoFactorAuthenticationForPage(authentication.session);

  if (await authentication.authorize("login", "manage")) redirect("/app");

  const humanResourcesHandles = await getHumanResourcesContacts();
  const humanResources =
    humanResourcesHandles.length > 0 ? (
      <HumanResourcesPopover handles={humanResourcesHandles} />
    ) : (
      "Human Resources"
    );

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center background-primary py-8">
      <main className="w-full max-w-lg">
        <h1 className="mx-8 mb-4 text-center font-mono text-xl font-bold uppercase">
          <FaRegCheckCircle className="relative -top-0.5 inline text-green-500" />{" "}
          Anmeldung erfolgreich
        </h1>

        <div className="mx-4 flex flex-col gap-2 corners-secondary bg-neutral-800/50 p-4">
          <p>
            Bitte melde dich bei {humanResources} oder der Leitung, um deinen
            Account freischalten zu lassen.
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 px-4">
          <dl className="flex max-w-full flex-col text-xs text-neutral-500">
            <UserDetail
              label="Discord-ID"
              value={authentication.session.discordId}
            />
            <UserDetail
              label="User-ID"
              value={authentication.session.user.id}
            />
            <UserDetail
              label="E-Mail-Adresse"
              value={authentication.session.user.email}
            />
            <UserDetail
              label="Spynet-Eintrag"
              value={authentication.session.entity?.id}
            />
          </dl>

          <ClearanceLogout />
        </div>
      </main>

      <div className="mt-4 h-px w-2 bg-neutral-700" />

      <Footer className="mt-4" />

      <AdminToolbar />
    </div>
  );
}

interface UserDetailProps {
  readonly label: string;
  readonly value: string | null | undefined;
}

const UserDetail = ({ label, value }: UserDetailProps) => {
  return (
    <div className="flex gap-1">
      <dt className="w-28 flex-none">{label}:</dt>
      <dd className="flex-1 truncate" title={value || undefined}>
        {value || "-"}
      </dd>
    </div>
  );
};
