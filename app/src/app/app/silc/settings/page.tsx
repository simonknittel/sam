import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/common/components/Tile";
import { AuecConversionRateSetting } from "@/modules/silc/components/AuecConversionRateSetting";
import { ExpireAllSilc } from "@/modules/silc/components/ExpireAllSilc";
import { RefreshSilcBalances } from "@/modules/silc/components/RefreshSilcBalances";
import { RoleSalaries } from "@/modules/silc/components/RoleSalaries";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/silc/settings");
  await authentication.authorizePage("silcSetting", "manage");

  const silcBalanceOfOtherCitizenManage = await authentication.authorize(
    "silcBalanceOfOtherCitizen",
    "manage",
  );

  return (
    <div className="flex flex-col gap-4">
      <SuspenseWithErrorBoundaryTile>
        <AuecConversionRateSetting />
      </SuspenseWithErrorBoundaryTile>

      <SuspenseWithErrorBoundaryTile>
        <RoleSalaries />
      </SuspenseWithErrorBoundaryTile>

      {silcBalanceOfOtherCitizenManage && (
        <Tile heading="Other" childrenClassName="flex gap-2">
          <RefreshSilcBalances />
          <ExpireAllSilc />
        </Tile>
      )}
    </div>
  );
}
