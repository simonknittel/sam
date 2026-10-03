import { SeasonalTopBarSlot } from "@/modules/seasonal-events/components/SeasonalTopBarSlot";
import clsx from "clsx";
import { CmdKLoader } from "../CmdK/CmdKLoader";
import { Account } from "./Account";
import { Apps } from "./Apps";
import { Create } from "./Create";
import { Notifications } from "./Notifications";
import { Onboarding } from "./Onboarding";
import { Support } from "./Support";

interface Props {
  readonly className?: string;
}

export const TopBar = ({ className }: Props) => {
  return (
    <div className="fixed top-0 right-0 left-0 z-30 hidden bg-black px-2 pt-2 lg:block">
      <div
        className={clsx(
          "relative flex h-12 rounded-primary bg-secondary-opaque",
          className,
        )}
      >
        <div className="flex flex-1 items-center">
          <Apps />
          <Create />
        </div>

        <CmdKLoader className="w-96 flex-initial" />

        <div className="flex flex-1 justify-end">
          <Support />
          <Onboarding />
          <Notifications />
          <Account />
        </div>

        <SeasonalTopBarSlot />
      </div>
    </div>
  );
};
