"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { ImageUpload } from "@/modules/common/components/ImageUpload";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { Tile } from "@/modules/common/components/Tile";
import type { ManagedRole } from "@sam-monorepo/application";
import {
  ROLE_DESCRIPTION_MAXIMUM_LENGTH,
  ROLE_INACTIVITY_DAYS_MAXIMUM,
  ROLE_INACTIVITY_DAYS_MINIMUM,
  ROLE_LEVEL_MAXIMUM,
  ROLE_LEVEL_MINIMUM,
  ROLE_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";
import { updateRole } from "../actions/updateRole";
import { DeleteRole } from "./DeleteRole";
import { RoleTagsForm } from "./tags/RoleTagsForm";

interface Props {
  readonly className?: string;
  readonly role: Pick<
    ManagedRole,
    | "id"
    | "name"
    | "description"
    | "maxAgeDays"
    | "assignAfterInactiveDays"
    | "maxLevel"
    | "iconId"
    | "thumbnailId"
    | "icon"
    | "tags"
  >;
}

export const OverviewTab = ({ className, role }: Props) => {
  const { formAction: updateFormAction } = useAction(updateRole);

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Tile heading="Rolle bearbeiten">
        <form action={updateFormAction}>
          <input type="hidden" name="id" value={role.id} />

          <TextInput
            label="Name"
            name="name"
            defaultValue={role.name}
            maxLength={ROLE_NAME_MAXIMUM_LENGTH}
          />

          <Textarea
            label="Beschreibung"
            name="description"
            defaultValue={role.description ?? undefined}
            maxLength={ROLE_DESCRIPTION_MAXIMUM_LENGTH}
            hint="(Optional) Markdown wird unterstützt"
            className="mt-4"
          />

          <div className="grid grid-cols-2 gap-8">
            <div>
              <NumberInput
                label="Entfernung nach (in Tagen)"
                name="maxAgeDays"
                defaultValue={role.maxAgeDays ?? undefined}
                min={ROLE_INACTIVITY_DAYS_MINIMUM}
                max={ROLE_INACTIVITY_DAYS_MAXIMUM}
                step={1}
                hint="(Optional) Citizen, die sich innerhalb dieses Zeitraums nicht einloggen, wird automatisch diese Rolle entfernt"
                labelClassName="mt-4"
              />
            </div>

            <div>
              <NumberInput
                label="Zuweisung nach (in Tagen)"
                name="assignAfterInactiveDays"
                defaultValue={role.assignAfterInactiveDays ?? undefined}
                min={ROLE_INACTIVITY_DAYS_MINIMUM}
                max={ROLE_INACTIVITY_DAYS_MAXIMUM}
                step={1}
                hint="(Optional) Citizen, die sich innerhalb dieses Zeitraums nicht einloggen, wird automatisch diese Rolle zugewiesen"
                labelClassName="mt-4"
              />
            </div>
          </div>

          <NumberInput
            label="Level"
            name="maxLevel"
            defaultValue={role.maxLevel ?? undefined}
            min={ROLE_LEVEL_MINIMUM}
            max={ROLE_LEVEL_MAXIMUM}
            step={1}
            hint="(Optional) Die Anzahl an Level, die ein Citizen erreichen muss, um die Berechtigungen dieser Rolle zu erhalten"
            labelClassName="mt-4"
          />

          <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
            Speichern
          </SubmitButton>
        </form>
      </Tile>

      <RoleTagsForm
        roleId={role.id}
        tagIds={role.tags.map((assignment) => assignment.tagId)}
      />

      <Tile heading="Bilder">
        <div className="flex flex-col gap-4 md:flex-row">
          <div>
            <label className="block font-bold">Icon</label>

            <ImageUpload
              resourceType="role"
              resourceId={role.id}
              resourceAttribute="iconId"
              imageId={role.icon?.id}
              imageMimeType={role.icon?.mimeType}
              width={128}
              height={128}
              className={clsx(
                "group mt-2 size-32 rounded-secondary border border-neutral-700 text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300",
                {
                  "flex items-center justify-center after:content-['Bild_hochladen']":
                    !role.iconId,
                },
              )}
              imageClassName="size-32"
              pendingClassName="size-32"
            />

            <p className="mt-1 text-sm text-neutral-500">nur 1:1</p>
          </div>

          <div>
            <label className="block font-bold">Thumbnail</label>

            <ImageUpload
              resourceType="role"
              resourceId={role.id}
              resourceAttribute="thumbnailId"
              imageId={role.thumbnailId}
              width={228}
              height={128}
              className={clsx(
                "group mt-2 h-32 w-57 rounded-secondary border border-neutral-700 text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300",
                {
                  "flex items-center justify-center after:content-['Bild_hochladen']":
                    !role.thumbnailId,
                },
              )}
              imageClassName="w-57 h-32"
              pendingClassName="w-57 h-32"
            />

            <p className="mt-1 text-sm text-neutral-500">
              beliebiges Seitenverhältnis
            </p>
          </div>
        </div>
      </Tile>

      <DeleteRole role={role} />
    </div>
  );
};
