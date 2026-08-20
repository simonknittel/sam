"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { decreaseRoleAssignmentLevel } from "@/modules/citizen/actions/decreaseRoleAssignmentLevel";
import { deleteRoleAssignment } from "@/modules/citizen/actions/deleteRoleAssignment";
import { increaseRoleAssignmentLevel } from "@/modules/citizen/actions/increaseRoleAssignmentLevel";
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
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { Markdown } from "@/modules/common/components/Markdown";
import { Note } from "@/modules/common/components/Note";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { type Role } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import Image from "next/image";
import { useId } from "react";
import { FaCog, FaMinus, FaPlus, FaTrash } from "react-icons/fa";
import { useRolesContext } from "./RolesContext";

interface Props {
  readonly className?: string;
  readonly roleId: Role["id"];
  readonly showPlaceholder?: boolean;
  readonly citizenId?: string;
  readonly citizenLevel?: number | null;
  readonly onSuccess?: () => void;
  /**
   * Whether the badge opens the role's detail popover. Turn it off inside
   * another interactive element (e.g. a role picker's option button) —
   * the popover's trigger is a button and would nest buttons there.
   */
  readonly withPopover?: boolean;
}

export const SingleRoleBadge = ({
  className,
  roleId,
  showPlaceholder = false,
  citizenId,
  citizenLevel = 0,
  onSuccess,
  withPopover = true,
}: Props) => {
  const { roles } = useRolesContext();
  const authentication = useAuthentication();
  const {
    state: deleteRoleAssignmentState,
    formAction: deleteRoleAssignmentFormAction,
    isPending: isDeleteRoleAssignmentPending,
  } = useAction(deleteRoleAssignment, {
    onSuccess,
  });
  const {
    formAction: increaseRoleAssignmentLevelFormAction,
    isPending: isIncreaseRoleAssignmentLevelPending,
  } = useAction(increaseRoleAssignmentLevel, {
    onSuccess,
  });
  const {
    formAction: decreaseRoleAssignmentLevelFormAction,
    isPending: isDecreaseRoleAssignmentLevelPending,
  } = useAction(decreaseRoleAssignmentLevel, {
    onSuccess,
  });
  const deleteRoleAssignmentFormId = useId();

  const role = roles.find((role) => role.id === roleId);
  if (!role) return null;

  const canAssign =
    authentication &&
    authentication.authorize("otherRole", "assign", [
      {
        key: "roleId",
        value: role.id,
      },
    ]);
  const canDismiss =
    authentication &&
    authentication.authorize("otherRole", "dismiss", [
      {
        key: "roleId",
        value: role.id,
      },
    ]);
  const canManage =
    authentication && authentication.authorize("role", "manage");

  const showLevelProgress =
    role.maxLevel && citizenId && (citizenLevel ?? 0) < role.maxLevel;

  const badge = (
    <span
      className={clsx(
        "px-2 h-8 rounded-secondary bg-neutral-700/50 inline-flex align-middle gap-2 items-center overflow-hidden relative",
        {
          "pb-0.5 opacity-50": showLevelProgress,
        },
        className,
      )}
    >
      {role.icon && (
        <span className="aspect-square size-6 flex items-center justify-center">
          <Image
            src={getPublicUploadUrl(role.icon.id)}
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

      {showLevelProgress && (
        <span className="block absolute left-0 bottom-0 right-0 h-px bg-white/30">
          <span
            className="block h-full bg-me"
            style={{
              width: `${((citizenLevel ?? 0) / role.maxLevel!) * 100}%`,
            }}
          />
        </span>
      )}
    </span>
  );

  if (!withPopover) return badge;

  return (
    <PopoverBaseUI
      title="Rollendetails"
      trigger={badge}
      childrenClassName="w-[400px]"
    >
      <div>
        <div className="inline-flex align-middle gap-4 items-center">
          {role.icon ? (
            <span className="aspect-square size-12 flex items-center justify-center">
              <Image
                src={getPublicUploadUrl(role.icon.id)}
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
            <span className="size-12 border border-white/10 rounded-secondary" />
          )}

          <div>
            <p className="text-white/40 font-mono uppercase text-xs">Rolle</p>

            <div className="flex gap-2 items-center">
              <p className="text-lg font-bold font-mono uppercase">
                {role.name}
              </p>

              {canManage && (
                <Link
                  href={`/app/roles/${role.id}`}
                  title="Einstellungen"
                  className="text-sm text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
                >
                  <FaCog />
                </Link>
              )}
            </div>
          </div>
        </div>

        {role.description && (
          <div className="border-t border-white/10 mt-4 pt-4 max-h-60 overflow-y-auto">
            <Markdown>{role.description}</Markdown>
          </div>
        )}

        {citizenId && role.maxLevel && (
          <div className="border-t border-white/10 mt-4 pt-4 flex gap-4 items-center">
            <p className="text-white/40">Level</p>

            <div
              className="flex gap-px h-4 flex-1"
              title={`${citizenLevel ?? 0} von ${role.maxLevel} Level erreicht`}
            >
              {Array.from({ length: role.maxLevel }, (_, idx) => {
                const level = idx + 1;
                const isActive = level <= (citizenLevel ?? 0);

                return (
                  <span
                    key={idx}
                    className={clsx(
                      "block flex-1",
                      isActive ? "bg-me" : "bg-neutral-700/50",
                    )}
                  />
                );
              })}
            </div>

            {(canDismiss || canAssign) && (
              <div className="flex gap-1">
                {canDismiss && (
                  <form action={decreaseRoleAssignmentLevelFormAction}>
                    <input type="hidden" name="citizenId" value={citizenId} />
                    <input type="hidden" name="roleId" value={role.id} />
                    <Button2
                      variant={Button2Variant.Secondary}
                      disabled={isDecreaseRoleAssignmentLevelPending}
                    >
                      {isDecreaseRoleAssignmentLevelPending ? (
                        <AsciiSpinner />
                      ) : (
                        <FaMinus />
                      )}
                    </Button2>
                  </form>
                )}

                {canAssign && (
                  <form action={increaseRoleAssignmentLevelFormAction}>
                    <input type="hidden" name="citizenId" value={citizenId} />
                    <input type="hidden" name="roleId" value={role.id} />
                    <Button2
                      variant={Button2Variant.Secondary}
                      disabled={isIncreaseRoleAssignmentLevelPending}
                    >
                      {isIncreaseRoleAssignmentLevelPending ? (
                        <AsciiSpinner />
                      ) : (
                        <FaPlus />
                      )}
                    </Button2>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {citizenId && canDismiss && (
          <div className="border-t border-white/10 mt-4 pt-4">
            <form
              action={deleteRoleAssignmentFormAction}
              id={deleteRoleAssignmentFormId}
            >
              <input type="hidden" name="citizenId" value={citizenId} />
              <input type="hidden" name="roleId" value={role.id} />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button2
                    variant={Button2Variant.Secondary}
                    disabled={isDeleteRoleAssignmentPending}
                  >
                    {isDeleteRoleAssignmentPending ? (
                      <AsciiSpinner />
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

                    <AlertDialogAction
                      type="submit"
                      form={deleteRoleAssignmentFormId}
                    >
                      Entfernen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {deleteRoleAssignmentState &&
                "error" in deleteRoleAssignmentState && (
                  <Note
                    type="error"
                    message={deleteRoleAssignmentState.error}
                    className={clsx("mt-4", {
                      "animate-pulse": isDeleteRoleAssignmentPending,
                    })}
                  />
                )}
            </form>
          </div>
        )}
      </div>
    </PopoverBaseUI>
  );
};
