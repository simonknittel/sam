import { prisma } from "@/db";
import type { ActivitySource } from "@/modules/activity/utils/activityEntry";
import type { ActivityFilters } from "@/modules/activity/utils/activityFilterParams";
import { requireAuthentication } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import {
  buildCursorConditions,
  cursorOrderBy,
  type MergedCursorSourceInput,
} from "@/modules/common/CursorPagination/mergedCursor";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  type Entity,
  type Organization,
} from "@sam-monorepo/database/client";
import { ConfirmMembership } from "../components/ConfirmMembership";
import { OrganizationLink } from "../components/OrganizationLink";
import { OrganizationActivitySourceKey } from "./organizationActivityTypes";

interface Input {
  /** Restricts the source to one organization's history. */
  readonly organizationId?: Organization["id"];
  /** Restricts the membership source to one citizen's history. */
  readonly citizenId?: Entity["id"];
  /** Whether the entry's subject gets its own column. */
  readonly withTarget?: boolean;
  /**
   * Whether this context runs the confirmation workflow. Only there do
   * entries awaiting confirmation show up at all — and only for those who
   * may confirm them.
   */
  readonly withConfirmation?: boolean;
  readonly filters?: ActivityFilters;
}

const buildDateAndActorConditions = (filters?: ActivityFilters) => ({
  ...(filters?.actorIds ? { createdById: { in: filters.actorIds } } : {}),
  ...(filters && Object.keys(filters.createdAt).length > 0
    ? { createdAt: filters.createdAt }
    : {}),
});

/**
 * Which confirmation states this context may see. Everywhere but the
 * organization page only confirmed entries exist as far as readers are
 * concerned.
 */
const getConfirmationFilter = async (withConfirmation?: boolean) => {
  if (!withConfirmation) return { confirmed: ConfirmationStatus.CONFIRMED };

  const authentication = await requireAuthentication();
  const canConfirm = await authentication.authorize(
    "organizationMembership",
    "confirm",
  );

  return canConfirm ? {} : { confirmed: ConfirmationStatus.CONFIRMED };
};

export const createOrganizationCreatedSource = (
  input: Input = {},
): ActivitySource =>
  withTrace(
    "organizationCreatedActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("organization", "read"))) return [];

      const organizations = await prisma.organization.findMany({
        where: {
          AND: [
            {
              ...(input.organizationId ? { id: input.organizationId } : {}),
              ...buildDateAndActorConditions(input.filters),
            },
            ...buildCursorConditions(
              position,
              OrganizationActivitySourceKey.Created,
              direction,
            ),
          ],
        },
        orderBy: cursorOrderBy(direction),
        take,
        select: {
          id: true,
          name: true,
          logo: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              handle: true,
            },
          },
          /** The name the organization was created under */
          attributeHistoryEntries: {
            where: {
              attributeKey: "name",
              oldValue: null,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
            select: {
              newValue: true,
            },
          },
        },
      });

      return organizations.map((organization) => ({
        sourceKey: OrganizationActivitySourceKey.Created,
        id: organization.id,
        date: organization.createdAt,
        actor: organization.createdBy,
        target: input.withTarget ? (
          <OrganizationLink organization={organization} />
        ) : undefined,
        message: (
          <p>
            Erstellt unter dem Namen{" "}
            <em>
              {organization.attributeHistoryEntries[0]?.newValue ??
                organization.name}
            </em>
          </p>
        ),
      }));
    },
  );

/**
 * Renames never go through the confirmation workflow — nothing writes an
 * unconfirmed one — so they carry no confirmation status either.
 */
export const createOrganizationRenamedSource = (
  input: Input = {},
): ActivitySource =>
  withTrace(
    "organizationRenamedActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("organization", "read"))) return [];

      const entries = await prisma.organizationAttributeHistoryEntry.findMany({
        where: {
          AND: [
            {
              ...(input.organizationId
                ? { organizationId: input.organizationId }
                : {}),
              ...buildDateAndActorConditions(input.filters),
              /**
               * The row recording the name an organization was created under
               * is told by the creation entry instead.
               */
              NOT: {
                attributeKey: "name",
                oldValue: null,
              },
            },
            ...buildCursorConditions(
              position,
              OrganizationActivitySourceKey.Renamed,
              direction,
            ),
          ],
        },
        orderBy: cursorOrderBy(direction),
        take,
        select: {
          id: true,
          attributeKey: true,
          newValue: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              handle: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      });

      return entries.map((entry) => {
        switch (entry.attributeKey) {
          case "name":
            return {
              sourceKey: OrganizationActivitySourceKey.Renamed,
              id: entry.id,
              date: entry.createdAt,
              actor: entry.createdBy,
              target: input.withTarget ? (
                <OrganizationLink organization={entry.organization} />
              ) : undefined,
              message: (
                <p>
                  Umbenannt in <em>{entry.newValue}</em>
                </p>
              ),
            };

          default:
            throw new Error(`Unknown attribute key: ${entry.attributeKey}`);
        }
      });
    },
  );

export const createOrganizationMembershipSource = (
  input: Input = {},
): ActivitySource =>
  withTrace(
    "organizationMembershipActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("organization", "read"))) return [];

      const alsoVisibilityRedacted = await authentication.authorize(
        "organizationMembership",
        "read",
        [
          {
            key: "alsoVisibilityRedacted",
            value: true,
          },
        ],
      );

      const entries = await prisma.organizationMembershipHistoryEntry.findMany({
        where: {
          AND: [
            {
              ...(input.organizationId
                ? { organizationId: input.organizationId }
                : {}),
              ...(input.citizenId ? { citizenId: input.citizenId } : {}),
              ...buildDateAndActorConditions(input.filters),
              ...(await getConfirmationFilter(input.withConfirmation)),
              visibility: {
                in: alsoVisibilityRedacted
                  ? [
                      OrganizationMembershipVisibility.PUBLIC,
                      OrganizationMembershipVisibility.REDACTED,
                    ]
                  : [OrganizationMembershipVisibility.PUBLIC],
              },
            },
            ...buildCursorConditions(
              position,
              OrganizationActivitySourceKey.Membership,
              direction,
            ),
          ],
        },
        orderBy: cursorOrderBy(direction),
        take,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          citizen: {
            select: {
              id: true,
              handle: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              handle: true,
            },
          },
        },
      });

      return entries.map((entry) => ({
        sourceKey: OrganizationActivitySourceKey.Membership,
        id: entry.id,
        date: entry.createdAt,
        actor: entry.createdBy,
        target: input.withTarget ? (
          <CitizenLink citizen={entry.citizen} />
        ) : undefined,
        message: buildMembershipMessage(
          entry.type,
          /** On an organization's own page the organization is a given */
          input.organizationId ? null : entry.organization,
        ),
        ...(input.withConfirmation
          ? {
              confirmation: entry.confirmed,
              confirmAction: <ConfirmMembership entry={entry} compact />,
            }
          : {}),
      }));
    },
  );

const buildMembershipMessage = (
  type: OrganizationMembershipType,
  organization: Pick<Organization, "id" | "name" | "logo"> | null,
) => {
  const organizationSuffix = organization ? (
    <>
      {" "}
      zu <OrganizationLink organization={organization} />
    </>
  ) : null;

  switch (type) {
    case OrganizationMembershipType.MAIN:
      return (
        <p>
          Als <em>Main</em>
          {organizationSuffix} hinzugefügt
        </p>
      );

    case OrganizationMembershipType.AFFILIATE:
      return (
        <p>
          Als <em>Affiliate</em>
          {organizationSuffix} hinzugefügt
        </p>
      );

    case OrganizationMembershipType.LEFT:
      return organization ? (
        <p>
          Aus <OrganizationLink organization={organization} /> entfernt
        </p>
      ) : (
        <p>Entfernt</p>
      );

    default:
      throw new Error(`Unknown membership type: ${type satisfies never}`);
  }
};
