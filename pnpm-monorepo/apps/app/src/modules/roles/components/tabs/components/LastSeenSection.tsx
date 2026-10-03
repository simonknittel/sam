import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  className?: string;
}

const LastSeenSection = ({ className }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Zuletzt gesehen</h4>

      <div className="mt-2 grid grid-cols-3 rounded-secondary border border-neutral-700 p-4">
        <div>
          <h5 className="mb-2 font-bold">Lesen</h5>
          <YesNoCheckbox {...register("lastSeen;read")} />
        </div>
      </div>
    </div>
  );
};

export default LastSeenSection;
