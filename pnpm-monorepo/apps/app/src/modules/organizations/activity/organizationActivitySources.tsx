import type { ActivitySource } from "@/modules/activity/utils/activityEntry";
import type { ActivityFilters } from "@/modules/activity/utils/activityFilterParams";
import { getApplicationContext, getRequestActor } from "@/modules/application";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findOrganizationCreatedRows,
  findOrganizationMembershipRows,
  findOrganizationRenamedRows,
  type OrganizationActivityInput,
} from "@sam-monorepo/application";
import {
  OrganizationMembershipType,
  type Citizen,
  type Organization,
} from "@sam-monorepo/database/client";
import type { MergedCursorSourceInput } from "@sam-monorepo/domain";
import { ConfirmMembership } from "../components/ConfirmMembership";
import { OrganizationLink } from "../components/OrganizationLink";
import {
  ORGANIZATION_ACTIVITY_TYPE_LABELS,
  OrganizationActivitySourceKey,
} from "./organizationActivityTypes";

interface Input {
  /** Restricts the source to one organization's history. */
  readonly organizationId?: Organization["id"];
  /** Restricts the membership source to one citizen's history. */
  readonly citizenId?: Citizen["id"];
  /** Whether the entry's subject gets its own column. */
  readonly withTarget?: boolean;
  /** See `OrganizationMembershipActivityInput.withConfirmation` */
  readonly withConfirmation?: boolean;
  readonly filters?: ActivityFilters;
}

const toActivityInput = (
  { organizationId, filters }: Input,
  sourceKey: OrganizationActivitySourceKey,
  sourceInput: MergedCursorSourceInput,
): OrganizationActivityInput => ({
  ...sourceInput,
  sourceKey,
  organizationId,
  actorIds: filters?.actorIds,
  createdAt: filters?.createdAt,
});

export const createOrganizationCreatedSource = (
  input: Input = {},
): ActivitySource =>
  withTrace(
    "organizationCreatedActivitySource",
    async (sourceInput: MergedCursorSourceInput) => {
      const organizations = await findOrganizationCreatedRows(
        getApplicationContext(),
        await getRequestActor(),
        toActivityInput(
          input,
          OrganizationActivitySourceKey.Created,
          sourceInput,
        ),
      );

      return organizations.map((organization) => ({
        sourceKey: OrganizationActivitySourceKey.Created,
        type: ORGANIZATION_ACTIVITY_TYPE_LABELS[
          OrganizationActivitySourceKey.Created
        ],
        id: organization.id,
        date: organization.createdAt,
        actor: organization.createdBy,
        target: input.withTarget ? (
          <OrganizationLink organization={organization} />
        ) : undefined,
        message: (
          <p>
            Erstellt unter dem Namen{" "}
            <em>{organization.initialName ?? organization.name}</em>
          </p>
        ),
      }));
    },
  );

/** Without a confirmation status, see `findOrganizationRenamedRows()` */
export const createOrganizationRenamedSource = (
  input: Input = {},
): ActivitySource =>
  withTrace(
    "organizationRenamedActivitySource",
    async (sourceInput: MergedCursorSourceInput) => {
      const entries = await findOrganizationRenamedRows(
        getApplicationContext(),
        await getRequestActor(),
        toActivityInput(
          input,
          OrganizationActivitySourceKey.Renamed,
          sourceInput,
        ),
      );

      return entries.map((entry) => {
        switch (entry.attributeKey) {
          case "name":
            return {
              sourceKey: OrganizationActivitySourceKey.Renamed,
              type: ORGANIZATION_ACTIVITY_TYPE_LABELS[
                OrganizationActivitySourceKey.Renamed
              ],
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
    async (sourceInput: MergedCursorSourceInput) => {
      const entries = await findOrganizationMembershipRows(
        getApplicationContext(),
        await getRequestActor(),
        {
          ...toActivityInput(
            input,
            OrganizationActivitySourceKey.Membership,
            sourceInput,
          ),
          citizenId: input.citizenId,
          withConfirmation: input.withConfirmation,
        },
      );

      return entries.map((entry) => ({
        sourceKey: OrganizationActivitySourceKey.Membership,
        type: ORGANIZATION_ACTIVITY_TYPE_LABELS[
          OrganizationActivitySourceKey.Membership
        ],
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
              /** The action refuses a decision about a deleted citizen */
              confirmAction:
                entry.citizen.deletedAt === null ? (
                  <ConfirmMembership
                    /** Only the IDs go to the browser, not the full entry */
                    entry={{
                      id: entry.id,
                      organizationId: entry.organizationId,
                      citizenId: entry.citizenId,
                    }}
                  />
                ) : undefined,
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
