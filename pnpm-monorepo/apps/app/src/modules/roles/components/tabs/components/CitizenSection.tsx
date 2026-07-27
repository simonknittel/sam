import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  className?: string;
}

const CitizenSection = ({ className }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Citizen</h4>

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2 grid grid-cols-3">
        <div>
          <h5 className="font-bold mb-2">Erstellen</h5>
          <YesNoCheckbox {...register("citizen;create")} />
        </div>

        <div>
          <h5 className="font-bold mb-2">Lesen</h5>
          <YesNoCheckbox {...register("citizen;read")} />
        </div>

        <div>
          <h5 className="font-bold mb-2">Löschen</h5>
          <YesNoCheckbox {...register("citizen;delete")} />
        </div>
      </div>
    </div>
  );
};

export default CitizenSection;
