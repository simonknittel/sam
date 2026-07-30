import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { FaInfoCircle } from "react-icons/fa";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  readonly className?: string;
}

export const OrganizationMembershipSection = ({ className }: Props) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Mitglieder</h4>

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2 grid grid-cols-3 grid-rows-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Lesen</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Nutzer mit dieser Berechtigung können Organisationsmitglieder
              sehen, die ihre Sichtbarkeit auf &quot;Visible&quot; gesetzt
              haben.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("organizationMembership;read")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Lesen (Redacted)</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Nutzer mit dieser Berechtigung können Organisationsmitglieder
              sehen, die ihre Sichtbarkeit auf &quot;Redacted&quot; gesetzt
              haben.
            </Tooltip>
          </div>

          <YesNoCheckbox
            {...register(
              "organizationMembership;read;alsoVisibilityRedacted=true",
            )}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Erstellen</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Nutzer mit dieser Berechtigung können Citizen einer Organisation
              hinzufügen. Dies Mitgliedschaften gelten erst mal als unbestätigt.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("organizationMembership;create")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Löschen</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Nutzer mit dieser Berechtigung können Citizen aus einer
              Organisation entfernen.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("organizationMembership;delete")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Bestätigen</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Nutzer mit dieser Berechtigung können die Mitgliedschaft eines
              Citizen in einer Organisation bestätigen.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("organizationMembership;confirm")} />
        </div>
      </div>
    </div>
  );
};
