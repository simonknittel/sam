import type { Prisma } from "@sam-monorepo/database/client";
import {
  resolveEventTemplatePermissions,
  type EventTemplateViewer,
  type ResolvedEventTemplatePermissions,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { EventTemplateErrorMessage } from "./eventTemplateErrors.js";

/**
 * The admin mode is part of `authorize()` and therefore flows into
 * `hasEventManage`, which grants every capability on every template in the
 * resolver
 */
export const toEventTemplateViewer = (actor: Actor): EventTemplateViewer => ({
  citizenId: actor.citizen?.id ?? null,
  roleIds: actor.roleIds,
  hasEventManage: actor.authorize("event", "manage"),
  hasTemplateShareManage: actor.authorize("eventTemplateShare", "manage"),
});

/**
 * Matches exactly the templates that `resolveEventTemplatePermissions()` lets
 * the viewer see, also their own soft-deleted ones, which they can restore.
 * Combine it with an `AND` rather than spreading it, so a caller's own `OR`
 * cannot overwrite it.
 */
export const buildVisibleEventTemplatesWhere = (
  viewer: EventTemplateViewer,
): Prisma.EventTemplateWhereInput => {
  if (viewer.hasEventManage) return {};

  const alternatives: Prisma.EventTemplateWhereInput[] = [];

  if (viewer.citizenId) alternatives.push({ ownedById: viewer.citizenId });

  if (viewer.roleIds.size > 0)
    alternatives.push({
      deletedAt: null,
      roleAccess: { some: { roleId: { in: [...viewer.roleIds] } } },
    });

  /** Prisma reads an empty OR as "matches nothing", which is what we want */
  return { OR: alternatives };
};

const EVENT_TEMPLATE_ACCESS_SELECT = {
  id: true,
  ownedById: true,
  deletedAt: true,
  roleAccess: { select: { roleId: true, type: true } },
} as const satisfies Prisma.EventTemplateSelect;

type EventTemplateAccessFields = Prisma.EventTemplateGetPayload<{
  select: typeof EVENT_TEMPLATE_ACCESS_SELECT;
}>;

/**
 * The select of the caller cannot change the fields of the permission resolver
 */
export type EventTemplateWithAccess<Select extends Prisma.EventTemplateSelect> =
  Omit<
    Prisma.EventTemplateGetPayload<{ select: Select }>,
    keyof EventTemplateAccessFields
  > &
    EventTemplateAccessFields;

export interface EventTemplateAccess<
  Select extends Prisma.EventTemplateSelect,
> {
  readonly template: EventTemplateWithAccess<Select>;
  readonly permissions: ResolvedEventTemplatePermissions;
}

/**
 * Null also when the actor may not read the template: deliberately
 * indistinguishable. A soft-deleted template is in the result for the actors
 * who can restore it.
 */
export const findEventTemplateAccess = async <
  const Select extends Prisma.EventTemplateSelect = Record<never, never>,
>(
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
  select: Select = {} as Select,
): Promise<EventTemplateAccess<Select> | null> => {
  const viewer = toEventTemplateViewer(actor);

  /**
   * Prisma cannot resolve the payload of a generic select, thus the type of
   * the row comes from `EventTemplateWithAccess`. The access fields come
   * last, thus they always have the shape of the resolver.
   */
  const template = (await context.prisma.eventTemplate.findFirst({
    where: {
      AND: [{ id: templateId }, buildVisibleEventTemplatesWhere(viewer)],
    },
    select: { ...select, ...EVENT_TEMPLATE_ACCESS_SELECT },
  })) as EventTemplateWithAccess<Select> | null;
  if (!template) return null;

  const permissions = resolveEventTemplatePermissions([template], viewer).get(
    template.id,
  );
  if (!permissions?.canRead) return null;

  return { template, permissions };
};

interface EventTemplateGuardOptions<Select extends Prisma.EventTemplateSelect> {
  readonly select?: Select;
}

interface EventTemplateRequirement {
  /** Without it, a deleted template gives a ConflictError */
  readonly allowDeleted: boolean;
  readonly permission: keyof ResolvedEventTemplatePermissions;
  readonly forbiddenMessage: string;
}

const requireEventTemplateAccess = async <
  const Select extends Prisma.EventTemplateSelect,
>(
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
  select: Select | undefined,
  { allowDeleted, permission, forbiddenMessage }: EventTemplateRequirement,
): Promise<EventTemplateAccess<Select>> => {
  const access = await findEventTemplateAccess(
    context,
    actor,
    templateId,
    select,
  );

  if (!access) throw new NotFoundError(EventTemplateErrorMessage.NotFound);

  if (!allowDeleted && access.template.deletedAt !== null)
    throw new ConflictError(EventTemplateErrorMessage.Deleted);

  if (!access.permissions[permission])
    throw new ForbiddenError(forbiddenMessage);

  return access;
};

export const requireReadableEventTemplate = async <
  const Select extends Prisma.EventTemplateSelect = Record<never, never>,
>(
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
  {
    allowDeleted = false,
    select,
  }: EventTemplateGuardOptions<Select> & {
    /** For example for the lineup page */
    readonly allowDeleted?: boolean;
  } = {},
): Promise<EventTemplateAccess<Select>> => {
  const access = await requireEventTemplateAccess(
    context,
    actor,
    templateId,
    select,
    {
      allowDeleted: true,
      permission: "canRead",
      forbiddenMessage: "The user cannot read the event template",
    },
  );

  /** For a reader, a deleted template does not exist */
  if (!allowDeleted && access.template.deletedAt !== null)
    throw new NotFoundError(EventTemplateErrorMessage.NotFound);

  return access;
};

/** Templates never freeze, because they have no schedule to be over */
export const requireEditableEventTemplate = <
  const Select extends Prisma.EventTemplateSelect = Record<never, never>,
>(
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
  { select }: EventTemplateGuardOptions<Select> = {},
): Promise<EventTemplateAccess<Select>> =>
  requireEventTemplateAccess(context, actor, templateId, select, {
    allowDeleted: false,
    permission: "canEdit",
    forbiddenMessage: "The user cannot edit the event template",
  });

/** A deleted template is in the result: the restore needs it */
export const requireManageableEventTemplate = <
  const Select extends Prisma.EventTemplateSelect = Record<never, never>,
>(
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
  { select }: EventTemplateGuardOptions<Select> = {},
): Promise<EventTemplateAccess<Select>> =>
  requireEventTemplateAccess(context, actor, templateId, select, {
    allowDeleted: true,
    permission: "canManage",
    forbiddenMessage: "The user cannot manage the event template",
  });

export const requireShareableEventTemplate = <
  const Select extends Prisma.EventTemplateSelect = Record<never, never>,
>(
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
  { select }: EventTemplateGuardOptions<Select> = {},
): Promise<EventTemplateAccess<Select>> =>
  requireEventTemplateAccess(context, actor, templateId, select, {
    allowDeleted: false,
    permission: "canManageShares",
    forbiddenMessage: "The user cannot change the shares of the event template",
  });
