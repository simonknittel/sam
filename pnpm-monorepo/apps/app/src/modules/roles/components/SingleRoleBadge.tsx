"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { decreaseRoleAssignmentLevel } from "@/modules/citizen/actions/decreaseRoleAssignmentLevel";
import { deleteRoleAssignment } from "@/modules/citizen/actions/deleteRoleAssignment";
import { increaseRoleAssignmentLevel } from "@/modules/citizen/actions/increaseRoleAssignmentLevel";
import {
  AlertDialog,
  useSubmitConfirmation,
} from "@/modules/common/components/AlertDialog";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { type Role } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";
import Image from "next/image";
import { FaCog, FaMinus, FaPlus, FaTrash } from "react-icons/fa";
import { useRolesContext } from "./RolesContext";

/**
 * Role badges show on many pages, but the description shows only in the
 * popover. Thus the Markdown parser loads only when a popover opens.
 */
const Markdown = dynamic(
  () =>
    import("@/modules/common/components/Markdown").then((mod) => mod.Markdown),
  { loading: () => <AsciiSpinner /> },
);

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
  /**
   * The errors show as toasts: when a different user removed the role, the
   * refresh removes this badge.
   */
  const {
    formAction: deleteRoleAssignmentFormAction,
    isPending: isDeleteRoleAssignmentPending,
  } = useAction(deleteRoleAssignment, {
    onSuccess,
  });
  const { formAction: increaseRoleAssignmentLevelFormAction } = useAction(
    increaseRoleAssignmentLevel,
    { onSuccess },
  );
  const { formAction: decreaseRoleAssignmentLevelFormAction } = useAction(
    decreaseRoleAssignmentLevel,
    { onSuccess },
  );
  const removeConfirmation = useSubmitConfirmation();

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
        "relative inline-flex h-8 items-center gap-2 overflow-hidden rounded-secondary bg-neutral-700/50 px-2 align-middle",
        {
          "pb-0.5 opacity-50": showLevelProgress,
        },
        className,
      )}
    >
      {role.icon && (
        <span className="flex aspect-square size-6 items-center justify-center">
          <Image
            src={getPublicUploadUrl(role.icon.id)}
            alt=""
            width={24}
            height={24}
            className="max-h-full max-w-full"
            unoptimized={["image/svg+xml", "image/gif"].includes(
              role.icon.mimeType,
            )}
            loading="lazy"
          />
        </span>
      )}

      {!role.iconId && showPlaceholder && <span className="size-6" />}

      <span className="truncate font-mono text-sm" title={role.name}>
        {role.name}
      </span>

      {showLevelProgress && (
        <span className="absolute right-0 bottom-0 left-0 block h-px bg-white/30">
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
      childrenClassName="w-100"
    >
      <div>
        <div className="inline-flex items-center gap-4 align-middle">
          {role.icon ? (
            <span className="flex aspect-square size-12 items-center justify-center">
              <Image
                src={getPublicUploadUrl(role.icon.id)}
                alt=""
                width={48}
                height={48}
                className="max-h-full max-w-full"
                unoptimized={["image/svg+xml", "image/gif"].includes(
                  role.icon.mimeType,
                )}
                loading="lazy"
              />
            </span>
          ) : (
            <span className="size-12 rounded-secondary border border-white/10" />
          )}

          <div>
            <p className="font-mono text-xs text-white/40 uppercase">Rolle</p>

            <div className="flex items-center gap-2">
              <p className="font-mono text-lg font-bold uppercase">
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
          <div className="mt-4 max-h-60 overflow-y-auto border-t border-white/10 pt-4">
            <Markdown>{role.description}</Markdown>
          </div>
        )}

        {citizenId && role.maxLevel && (
          <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
            <p className="text-white/40">Level</p>

            <div
              className="flex h-4 flex-1 gap-px"
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
                    <SubmitButton
                      variant={Button2Variant.Secondary}
                      icon={<FaMinus />}
                      tooltip="Level verringern"
                    />
                  </form>
                )}

                {canAssign && (
                  <form action={increaseRoleAssignmentLevelFormAction}>
                    <input type="hidden" name="citizenId" value={citizenId} />
                    <input type="hidden" name="roleId" value={role.id} />
                    <SubmitButton
                      variant={Button2Variant.Secondary}
                      icon={<FaPlus />}
                      tooltip="Level erhöhen"
                    />
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {citizenId && canDismiss && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <form
              action={deleteRoleAssignmentFormAction}
              onSubmit={removeConfirmation.onSubmit}
            >
              <input type="hidden" name="citizenId" value={citizenId} />
              <input type="hidden" name="roleId" value={role.id} />

              <Button2
                type="submit"
                variant={Button2Variant.Secondary}
                disabled={isDeleteRoleAssignmentPending}
              >
                {isDeleteRoleAssignmentPending ? <AsciiSpinner /> : <FaTrash />}
                Entfernen
              </Button2>

              <AlertDialog
                isOpen={removeConfirmation.isOpen}
                onClose={removeConfirmation.close}
                title="Rolle entfernen?"
                description={
                  <>
                    Willst du die Rolle{" "}
                    <span className="font-bold">{role.name}</span> wirklich
                    entfernen?
                  </>
                }
                confirmLabel="Entfernen"
              />
            </form>
          </div>
        )}
      </div>
    </PopoverBaseUI>
  );
};
