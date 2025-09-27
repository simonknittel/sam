import { Algolia } from "@/modules/algolia/components/Algolia";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import { log } from "@/modules/logging";
import { type Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Einstellungen | S.A.M. - Sinister Incorporated",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/settings");

  const [showAlgolia] = await Promise.all([
    authentication.authorize("algolia", "manage"),
  ]);

  if (!showAlgolia) {
    void log.info("Forbidden request to page", {
      userId: authentication.session.user.id,
      reason: "Insufficient permissions",
    });

    redirect("/app");
  }

  return (
    <>
      {showAlgolia && (
        <Tile heading="Algolia">
          <Algolia />
        </Tile>
      )}
    </>
  );
}
