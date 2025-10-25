import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import clsx from "clsx";
import { Suspense } from "react";
import { CmdKLoader } from "../CmdK/CmdKLoader";
import { Account } from "./Account";
import { Apps } from "./Apps";
import { Create } from "./Create";
import { Notifications } from "./Notifications";

interface Props {
  readonly className?: string;
}

export const TopBar = async ({ className }: Props) => {
  const EnableProfitDistribution = await getUnleashFlag(
    UNLEASH_FLAG.EnableProfitDistribution,
  );

  return (
    <div className="bg-black hidden lg:block fixed left-0 right-0 top-0 z-30 px-2 pt-2">
      <div
        className={clsx(
          "flex background-secondary-opaque rounded-primary h-12",
          className,
        )}
      >
        <div className="flex-1 flex items-center">
          <Apps />
          <Create enableProfitDistribution={EnableProfitDistribution} />
        </div>

        <CmdKLoader className="flex-initial w-96" />

        <div className="flex-1 flex justify-end">
          <Suspense>
            <Notifications />
          </Suspense>
          <Account />
        </div>
      </div>
    </div>
  );
};
