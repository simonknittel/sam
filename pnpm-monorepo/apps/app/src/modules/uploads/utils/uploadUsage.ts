import { getEventTemplatePath } from "@/modules/event-templates/utils/eventTemplateConstraints";
import {
  buildWikiPageSnapshotsHref,
  createEventWikiHrefMode,
  getWikiPageRouteHref,
  GLOBAL_WIKI_HREF_MODE,
} from "@/modules/wiki/utils/wikiPageHref";
import {
  getEventContainerOfRow,
  listUploadUsages,
  UploadUsageType,
  type UploadUsageLocation,
  type UploadUsageSource,
  type UploadUsageWikiPage,
} from "@sam-monorepo/domain";

/** A place where an upload is referenced, as one row of the usage cell */
export interface UploadUsage {
  readonly type: UploadUsageType;
  /** Unique in the usages of one upload, for the React keys */
  readonly key: string;
  /** The name of the resource, for example the name of the role */
  readonly label: string;
  readonly href: string;
}

const getWikiPageSnapshotsRouteHref = (page: UploadUsageWikiPage) => {
  const container = getEventContainerOfRow(page);

  return buildWikiPageSnapshotsHref(
    container
      ? createEventWikiHrefMode(container, null)
      : GLOBAL_WIKI_HREF_MODE,
    page.id,
  );
};

const getUsageHref = (usage: UploadUsageLocation) => {
  switch (usage.type) {
    case UploadUsageType.RoleIcon:
    case UploadUsageType.RoleThumbnail:
      return `/app/roles/${usage.resource.id}`;

    case UploadUsageType.RoleTagIcon:
      return `/app/iam/tags/${usage.resource.id}`;

    case UploadUsageType.ManufacturerLogo:
      return `/app/fleet/settings/manufacturer/${usage.resource.id}`;

    case UploadUsageType.EventCover:
      return `/app/events/${usage.resource.id}`;

    case UploadUsageType.EventTemplateCover:
      return getEventTemplatePath(usage.resource.id);

    case UploadUsageType.WikiPageIcon:
    case UploadUsageType.WikiPageAttachment:
      return getWikiPageRouteHref(usage.resource);

    case UploadUsageType.WikiPageSnapshot:
      return getWikiPageSnapshotsRouteHref(usage.resource);

    default:
      throw new Error(`Unknown upload usage: ${usage satisfies never}`);
  }
};

/**
 * All places where an upload is referenced (see `listUploadUsages()`), as
 * links to the pages of the referencing resources.
 *
 * The links have no permission check: the target pages check their own
 * access, and the locations of an upload are no secret for a user who can
 * see the upload.
 */
export const getUploadUsages = (upload: UploadUsageSource): UploadUsage[] =>
  listUploadUsages(upload).map((usage) => ({
    type: usage.type,
    key: usage.key,
    label: usage.label,
    href: getUsageHref(usage),
  }));
