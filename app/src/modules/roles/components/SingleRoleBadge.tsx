"use client";

import { env } from "@/env";
import { useAction } from "@/modules/actions/utils/useAction";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { deleteRoleAssignment } from "@/modules/citizen/actions/deleteRoleAssignment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/common/components/AlertDialog";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Note } from "@/modules/common/components/Note";
import { Popover } from "@/modules/common/components/Popover";
import { type Role } from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import { useId } from "react";
import { FaSpinner, FaTrash } from "react-icons/fa";
import { useRolesContext } from "./RolesContext";

interface Props {
  readonly className?: string;
  readonly roleId: Role["id"];
  readonly showPlaceholder?: boolean;
  readonly citizenId?: string;
}

export const SingleRoleBadge = ({
  className,
  roleId,
  showPlaceholder = false,
  citizenId,
}: Props) => {
  const { roles } = useRolesContext();
  const authentication = useAuthentication();
  const { state, formAction, isPending } = useAction(deleteRoleAssignment);
  const formId = useId();

  const role = roles.find((role) => role.id === roleId);
  if (!role) return null;

  const canDismiss =
    authentication &&
    authentication.authorize("otherRole", "dismiss", [
      {
        key: "roleId",
        value: role.id,
      },
    ]);

  return (
    <Popover
      enableHover
      trigger={
        <span
          className={clsx(
            "px-2 py-1 rounded-secondary bg-neutral-700/50 inline-flex align-middle gap-2 items-center overflow-hidden",
            className,
          )}
        >
          {role.icon && (
            <span className="aspect-square size-6 flex items-center justify-center">
              <Image
                src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${role.icon.id}`}
                alt=""
                width={24}
                height={24}
                className="max-w-full max-h-full"
                unoptimized={["image/svg+xml", "image/gif"].includes(
                  role.icon.mimeType,
                )}
                loading="lazy"
              />
            </span>
          )}

          {!role.iconId && showPlaceholder && <span className="size-6" />}

          <span className="truncate font-mono text-sm">{role.name}</span>
        </span>
      }
    >
      <div>
        <div className="inline-flex align-middle gap-4 items-center">
          {role.icon ? (
            <span className="aspect-square size-12 flex items-center justify-center">
              <Image
                src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${role.icon.id}`}
                alt=""
                width={48}
                height={48}
                className="max-w-full max-h-full"
                unoptimized={["image/svg+xml", "image/gif"].includes(
                  role.icon.mimeType,
                )}
                loading="lazy"
              />
            </span>
          ) : (
            <span className="size-12 border border-neutral-700 rounded-secondary" />
          )}

          <div>
            <p className="opacity-50 font-mono uppercase text-xs">Rolle</p>
            <p className="text-lg font-bold font-mono uppercase">{role.name}</p>
          </div>
        </div>

        {citizenId && canDismiss && (
          <div className="border-t border-neutral-700 mt-4 pt-4">
            <form action={formAction} id={formId}>
              <input type="hidden" name="citizenId" value={citizenId} />
              <input type="hidden" name="roleId" value={role.id} />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button2
                    variant={Button2Variant.Secondary}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaTrash />
                    )}
                    Entfernen
                  </Button2>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rolle entfernen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Willst du die Rolle{" "}
                      <span className="font-bold">{role.name}</span> wirklich
                      entfernen?
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>

                    <AlertDialogAction type="submit" form={formId}>
                      Entfernen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {state && "error" in state && (
                <Note
                  type="error"
                  message={state.error}
                  className={clsx("mt-4", {
                    "animate-pulse": isPending,
                  })}
                />
              )}
            </form>
          </div>
        )}
      </div>
    </Popover>
  );
};
