"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Link } from "@/modules/common/components/Link";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { Tile } from "@/modules/common/components/Tile";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import { FaSave } from "react-icons/fa";
import { changeRoleTags } from "../../actions/changeRoleTags";
import { useRolesContext } from "../RolesContext";
import { RoleTagPicker } from "./RoleTagPicker";

interface Props {
  readonly roleId: string;
  /** All tags of the role */
  readonly tagIds: readonly BadgeRoleTag["id"][];
}

/** The tags of a role on the role page. Requires `role;manage`. */
export const RoleTagsForm = ({ roleId, tagIds }: Props) => {
  const { tags } = useRolesContext();
  const { formAction } = useAction(changeRoleTags);

  return (
    <Tile heading="Tags">
      <form action={formAction}>
        <input type="hidden" name="roleId" value={roleId} />

        {tags.length <= 0 && (
          <p className="mb-2 text-sm text-neutral-500">
            Es gibt noch keine Tags. Lege sie unter{" "}
            <Link
              href="/app/iam/tags"
              className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
            >
              IAM / Tags
            </Link>{" "}
            an.
          </p>
        )}

        <RoleTagPicker name="tagIds" defaultValue={tagIds} />

        <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
          Speichern
        </SubmitButton>
      </form>
    </Tile>
  );
};
