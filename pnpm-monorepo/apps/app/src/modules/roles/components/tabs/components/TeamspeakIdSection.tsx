import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  className?: string;
}

const TeamspeakIdSection = ({ className }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">TeamSpeak IDs</h4>

      <div className="mt-2 grid grid-cols-4 rounded-secondary border border-neutral-700 p-4">
        <div>
          <h5 className="mb-2 font-bold">Erstellen</h5>
          <YesNoCheckbox {...register("teamspeak-id;create")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Einsehen</h5>
          <YesNoCheckbox {...register("teamspeak-id;read")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Löschen</h5>
          <YesNoCheckbox {...register("teamspeak-id;delete")} />
        </div>

        <div>
          <h5 className="mb-2 font-bold">Bestätigen</h5>
          <YesNoCheckbox {...register("teamspeak-id;confirm")} />
        </div>
      </div>
    </div>
  );
};

export default TeamspeakIdSection;
