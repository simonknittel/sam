"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { ImageUpload } from "@/modules/common/components/ImageUpload";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";
import { updateRole } from "../actions/updateRole";
import { DeleteRole } from "./DeleteRole";

interface Props {
  readonly className?: string;
  readonly role: Role & {
    icon: Upload | null;
  };
}

export const OverviewTab = ({ className, role }: Props) => {
  const {
    state: updateState,
    formAction: updateFormAction,
    isPending: updateIsPending,
  } = useAction(updateRole, {
    errorToast: false,
  });

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <form
        action={updateFormAction}
        className={clsx("bg-secondary rounded-primary p-4", className)}
      >
        <input type="hidden" name="id" value={role.id} />

        <TextInput label="Name" name="name" defaultValue={role.name} />

        <Textarea
          label="Beschreibung"
          name="description"
          defaultValue={role.description ?? undefined}
          maxLength={2048}
          hint="(Optional) Markdown wird unterstützt"
          className="mt-4"
        />

        <div className="grid grid-cols-2 gap-8">
          <div>
            <NumberInput
              label="Entfernung nach (in Tagen)"
              name="maxAgeDays"
              defaultValue={role.maxAgeDays ?? undefined}
              min={1}
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
              min={1}
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
          min={1}
          step={1}
          hint="(Optional) Die Anzahl an Level, die ein Citizen erreichen muss, um die Berechtigungen dieser Rolle zu erhalten"
          labelClassName="mt-4"
        />

        <Button2
          type="submit"
          disabled={updateIsPending}
          className="ml-auto mt-4"
        >
          {updateIsPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>

        <ActionErrorNote className="mt-4" state={updateState} />
      </form>

      <section className={clsx("bg-secondary rounded-primary p-4", className)}>
        <h2 className="font-bold">Bilder</h2>

        <div className="flex flex-col md:flex-row gap-4 mt-4">
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
                "mt-2 size-32 border border-neutral-700 hover:border-neutral-500 text-neutral-500 hover:text-neutral-300 transition-colors group rounded-secondary",
                {
                  "after:content-['Bild_hochladen'] flex items-center justify-center":
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
                "mt-2 w-57 h-32 border border-neutral-700 hover:border-neutral-500 text-neutral-500 hover:text-neutral-300 transition-colors group rounded-secondary",
                {
                  "after:content-['Bild_hochladen'] flex items-center justify-center":
                    !role.thumbnailId,
                },
              )}
              imageClassName="w-[228px] h-32"
              pendingClassName="w-[228px] h-32"
            />

            <p className="mt-1 text-sm text-neutral-500">
              beliebiges Seitenverhältnis
            </p>
          </div>
        </div>
      </section>

      <DeleteRole role={role} />
    </div>
  );
};
