import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import {
  ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH,
  ROLE_TAG_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";

interface Props {
  readonly tag?: Pick<ManagedRoleTag, "name" | "description">;
  readonly autoFocus?: boolean;
}

export const RoleTagFields = ({ tag, autoFocus }: Props) => {
  return (
    <>
      <TextInput
        label="Name"
        name="name"
        defaultValue={tag?.name}
        required
        maxLength={ROLE_TAG_NAME_MAXIMUM_LENGTH}
        autoFocus={autoFocus}
      />

      <Textarea
        label="Beschreibung"
        name="description"
        defaultValue={tag?.description ?? undefined}
        maxLength={ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH}
        hint="(Optional) Die Rollenauswahl zeigt die Beschreibung als Tooltip des Tags."
        className="mt-4"
      />
    </>
  );
};
