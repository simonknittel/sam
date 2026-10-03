import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  readonly className?: string;
}

export const OrganizationSection = ({ className }: Props) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Organisationen</h4>

      <div className="mt-2 grid grid-cols-3 rounded-secondary border border-neutral-700 p-4">
        <div>
          <h5 className="mb-2 font-bold">Lesen</h5>
          <YesNoCheckbox {...register("organization;read")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Erstellen</h5>
          <YesNoCheckbox {...register("organization;create")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Löschen</h5>
          <YesNoCheckbox {...register("organization;delete")} />
        </div>
      </div>
    </div>
  );
};
