import {
  AuditEventType,
  CAPABILITY_CATALOG,
  CapabilityId,
  findGrantValidityProblem,
  getGrantValidityOfPreset,
  GranteeKind,
  GrantOperation,
  GrantValidityPreset,
  GrantValidityProblem,
  type GrantValidity,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import {
  DATE_TIME_INPUT_DESCRIPTION,
  dateTimeInputSchema,
} from "../../dateTime.js";
import { ConflictError, ValidationError } from "../../errors.js";
import { idSchema } from "../../pagination.js";
import { requireVisibleRoles } from "../../roles/roleVisibility.js";
import { requireActiveCitizens } from "../../spynet/requireActiveCitizens.js";
import { withSpan } from "../../withSpan.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  createActiveOwnShareGrantWhere,
  MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
  OWN_SHARE_GRANT_SELECT,
  toOwnShareGrant,
  toShareGrantGranteeKindOfDatabase,
  type OwnShareGrant,
} from "./ownShareGrant.js";
import { ShareGrantErrorMessage } from "./shareGrantErrors.js";

export enum ShareGrantValidityKind {
  /** A preset of the sharing popover. It starts now. */
  Preset = "preset",
  /** A start and an optional end of the owner */
  Custom = "custom",
}

export const createShareGrantInputSchema = z.object({
  grantee: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal(GranteeKind.Citizen), citizen_id: idSchema }),
      z.object({ kind: z.literal(GranteeKind.Role), role_id: idSchema }),
      z.object({ kind: z.literal(GranteeKind.Everyone) }),
    ])
    .describe(
      "citizen: one citizen. role: all citizens with the role at the time of each access. everyone: all citizens who can use the Remote Control Program.",
    ),
  capability_ids: z
    .array(z.enum(CapabilityId))
    .min(1)
    .max(Object.keys(CAPABILITY_CATALOG).length),
  operations: z
    .array(z.enum(GrantOperation))
    .min(1)
    .max(Object.values(GrantOperation).length)
    .default([GrantOperation.Read]),
  validity: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal(ShareGrantValidityKind.Preset),
      preset: z.enum(GrantValidityPreset),
    }),
    z.object({
      kind: z.literal(ShareGrantValidityKind.Custom),
      starts_at: dateTimeInputSchema.describe(
        `The start. It can be in the past: then the grant also shares the older data. ${DATE_TIME_INPUT_DESCRIPTION}`,
      ),
      ends_at: dateTimeInputSchema
        .nullable()
        .describe(
          `The grant is valid until before this time. Null: no end. ${DATE_TIME_INPUT_DESCRIPTION}`,
        ),
    }),
  ]),
});

export type CreateShareGrantInput = z.output<
  typeof createShareGrantInputSchema
>;

const VALIDITY_PROBLEM_MESSAGES: Readonly<
  Record<GrantValidityProblem, ShareGrantErrorMessage>
> = {
  [GrantValidityProblem.TimeNotValid]:
    ShareGrantErrorMessage.ValidityTimeNotValid,
  [GrantValidityProblem.EndNotAfterStart]:
    ShareGrantErrorMessage.ValidityEndNotAfterStart,
  [GrantValidityProblem.EndNotInFuture]:
    ShareGrantErrorMessage.ValidityEndNotInFuture,
};

const toGrantValidity = (
  validity: CreateShareGrantInput["validity"],
  now: Date,
): GrantValidity => {
  switch (validity.kind) {
    case ShareGrantValidityKind.Preset:
      return getGrantValidityOfPreset(validity.preset, now);

    case ShareGrantValidityKind.Custom: {
      const customValidity = {
        startsAt: validity.starts_at,
        endsAt: validity.ends_at,
      };
      const problem = findGrantValidityProblem(customValidity, now);
      if (problem)
        throw new ValidationError(VALIDITY_PROBLEM_MESSAGES[problem]);

      return customValidity;
    }

    default:
      throw new Error(`Unknown validity kind: ${validity satisfies never}`);
  }
};

/** The grantee columns of the kind. The other grantee column stays NULL (see the CHECK constraint). */
const toGranteeColumns = async (
  context: ApplicationContext,
  actor: Actor,
  ownerCitizenId: string,
  grantee: CreateShareGrantInput["grantee"],
) => {
  switch (grantee.kind) {
    case GranteeKind.Citizen:
      if (grantee.citizen_id === ownerCitizenId)
        throw new ValidationError(ShareGrantErrorMessage.GranteeIsOwner);

      await requireActiveCitizens(
        context,
        [grantee.citizen_id],
        ShareGrantErrorMessage.GranteeCitizenNotFound,
      );
      return { granteeCitizenId: grantee.citizen_id, granteeRoleId: null };

    case GranteeKind.Role:
      // The same choices as the role pickers of the other forms
      await requireVisibleRoles(
        context,
        actor,
        [grantee.role_id],
        ShareGrantErrorMessage.GranteeRoleNotFound,
      );
      return { granteeCitizenId: null, granteeRoleId: grantee.role_id };

    case GranteeKind.Everyone:
      return { granteeCitizenId: null, granteeRoleId: null };

    default:
      throw new Error(`Unknown grantee kind: ${grantee satisfies never}`);
  }
};

/**
 * The owner (the actor) shares capabilities with a grantee (see "Remote
 * access layer" of `docs/remote-control-program/README.md`). A preset starts
 * now. A custom validity can start in the past (decision 8). Writes
 * `REMOTE_CONTROL_PROGRAM_SHARE_GRANT_CREATED`.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 * (`RemoteControlProgramErrorMessage`)
 * @throws ValidationError with a `ShareGrantErrorMessage`: the grantee is
 * the owner, the citizen does not exist or is deleted, the role does not
 * exist or the owner cannot see it, or the custom validity is not valid
 * @throws ConflictError when the owner has
 * `MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER` active grants
 * (`ShareGrantErrorMessage.TooManyActiveGrants`)
 */
export const createShareGrant = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateShareGrantInput,
): Promise<OwnShareGrant> =>
  withSpan(context, "createShareGrant", async () => {
    const citizen = requireRemoteControlProgramUse(actor);
    const now = context.now();

    const validity = toGrantValidity(input.validity, now);
    const granteeColumns = await toGranteeColumns(
      context,
      actor,
      citizen.id,
      input.grantee,
    );
    const capabilityIds = [...new Set(input.capability_ids)];
    const operations = [...new Set(input.operations)];

    const grant = await context.prisma.$transaction(async (transaction) => {
      // Two parallel creations of one owner wait for each other, thus they cannot both pass the limit
      await transaction.$queryRaw`
        SELECT 1 FROM "Citizen" WHERE "id" = ${citizen.id} FOR NO KEY UPDATE
      `;

      const activeGrantCount = await transaction.shareGrant.count({
        where: createActiveOwnShareGrantWhere(citizen.id, now),
      });
      if (activeGrantCount >= MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER)
        throw new ConflictError(ShareGrantErrorMessage.TooManyActiveGrants);

      return transaction.shareGrant.create({
        data: {
          ownerId: citizen.id,
          granteeKind: toShareGrantGranteeKindOfDatabase(input.grantee.kind),
          ...granteeColumns,
          capabilityIds,
          operations,
          startsAt: validity.startsAt,
          endsAt: validity.endsAt,
        },
        select: OWN_SHARE_GRANT_SELECT,
      });
    });

    await context.audit.create([
      {
        type: AuditEventType.REMOTE_CONTROL_PROGRAM_SHARE_GRANT_CREATED,
        data: {
          grantId: grant.id,
          ownerCitizenId: citizen.id,
          granteeKind: input.grantee.kind,
          ...granteeColumns,
          capabilityIds,
          operations,
          startsAt: validity.startsAt,
          endsAt: validity.endsAt,
        },
        createdById: actor.userId,
      },
    ]);

    return toOwnShareGrant(grant);
  });
