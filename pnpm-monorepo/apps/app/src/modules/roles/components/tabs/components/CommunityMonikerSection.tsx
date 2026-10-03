import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  className?: string;
}

export const CommunityMonikerSection = ({ className }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Community Monikers</h4>

      <div className="mt-2 grid grid-cols-3 rounded-secondary border border-neutral-700 p-4">
        <div>
          <h5 className="mb-2 font-bold">Erstellen</h5>
          <YesNoCheckbox {...register("community-moniker;create")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Löschen</h5>
          <YesNoCheckbox {...register("community-moniker;delete")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Bestätigen</h5>
          <YesNoCheckbox {...register("community-moniker;confirm")} />
        </div>
      </div>
    </div>
  );
};
