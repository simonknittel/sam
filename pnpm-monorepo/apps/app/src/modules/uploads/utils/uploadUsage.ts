import { getEventTemplatePath } from "@/modules/event-templates/utils/eventTemplateConstraints";
import { getWikiPageContainer } from "@/modules/events/utils/eventContainer";
import {
  buildWikiPageSnapshotsHref,
  createEventWikiHrefMode,
  getWikiPageRouteHref,
  GLOBAL_WIKI_HREF_MODE,
} from "@/modules/wiki/utils/wikiPageHref";

/**
 * Where an upload is referenced. `Unused` is not a usage but its absence —
 * it never comes out of `getUploadUsages`, only out of the usage filter and
 * the badge an upload without any reference gets.
 *
 * The real kinds are exactly the usage relations of the `Upload` model,
 * and exactly the relations the nightly cleanup lambda checks before
 * deleting an upload (see `UPLOAD_USAGE_RELATIONS`). `wikiReports` is
 * deliberately not among them: report evidence is meant to expire with the
 * upload. Adding a relation to the model means adding it in both places.
 */
export enum UploadUsageType {
  RoleIcon = "roleIcon",
  RoleThumbnail = "roleThumbnail",
  ManufacturerLogo = "manufacturerLogo",
  EventCover = "eventCover",
  EventTemplateCover = "eventTemplateCover",
  WikiPageIcon = "wikiPageIcon",
  WikiPageAttachment = "wikiPageAttachment",
  WikiPageSnapshot = "wikiPageSnapshot",
  Unused = "unused",
}

export const UPLOAD_USAGE_TYPE_LABELS: Record<UploadUsageType, string> = {
  [UploadUsageType.RoleIcon]: "Rollen-Icon",
  [UploadUsageType.RoleThumbnail]: "Rollen-Thumbnail",
  [UploadUsageType.ManufacturerLogo]: "Hersteller-Bild",
  [UploadUsageType.EventCover]: "Event-Titelbild",
  [UploadUsageType.EventTemplateCover]: "Vorlagen-Titelbild",
  [UploadUsageType.WikiPageIcon]: "Wiki-Icon",
  [UploadUsageType.WikiPageAttachment]: "Wiki-Bild/-Anhang",
  [UploadUsageType.WikiPageSnapshot]: "Wiki-Snapshot",
  [UploadUsageType.Unused]: "Unbenutzt",
};

/** A single place an upload is referenced, as one row of the usage cell. */
export interface UploadUsage {
  readonly type: UploadUsageType;
  /** Stable across the references of one upload, for React keys. */
  readonly key: string;
  /** Name of the referencing resource, e.g. the role or wiki page name. */
  readonly label: string;
  readonly href: string;
}

interface NamedResource {
  readonly id: string;
  readonly name: string;
}

interface WikiPageReference {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly eventId: string | null;
  readonly templateId: string | null;
}

/** The usage relations of an upload, as `getUploads` selects them. */
export interface UploadUsageSource {
  readonly roleIcons: readonly NamedResource[];
  readonly roleThumbnails: readonly NamedResource[];
  readonly manufacturers: readonly NamedResource[];
  readonly eventCovers: readonly NamedResource[];
  readonly eventTemplateCovers: readonly NamedResource[];
  readonly wikiPageIcons: readonly WikiPageReference[];
  /** One link for each page, also when the page uses the upload two ways */
  readonly wikiPageLinks: readonly { readonly page: WikiPageReference }[];
  readonly wikiPageSnapshotLinks: readonly {
    readonly snapshot: { readonly page: WikiPageReference };
  }[];
}

/**
 * The snapshots of a page commonly use the same upload many times. The
 * usage is the page, one time.
 */
const getSnapshotPages = (
  links: UploadUsageSource["wikiPageSnapshotLinks"],
) => [
  ...new Map(
    links.map(({ snapshot }) => [snapshot.page.id, snapshot.page]),
  ).values(),
];

const getWikiPageSnapshotsRouteHref = (page: WikiPageReference) => {
  const container = getWikiPageContainer(page);

  return buildWikiPageSnapshotsHref(
    container
      ? createEventWikiHrefMode(container, null)
      : GLOBAL_WIKI_HREF_MODE,
    page.id,
  );
};

/**
 * Every place an upload is referenced, as links to the pages owning those
 * references. An empty result means the upload is unused and the nightly
 * cleanup will remove it.
 *
 * The links are not permission-checked here — the target pages enforce
 * their own access, and an upload's own locations are no secret to whoever
 * may already see the upload.
 */
export const getUploadUsages = (upload: UploadUsageSource): UploadUsage[] => [
  ...upload.roleIcons.map((role) => ({
    type: UploadUsageType.RoleIcon,
    key: `${UploadUsageType.RoleIcon}:${role.id}`,
    label: role.name,
    href: `/app/roles/${role.id}`,
  })),

  ...upload.roleThumbnails.map((role) => ({
    type: UploadUsageType.RoleThumbnail,
    key: `${UploadUsageType.RoleThumbnail}:${role.id}`,
    label: role.name,
    href: `/app/roles/${role.id}`,
  })),

  ...upload.manufacturers.map((manufacturer) => ({
    type: UploadUsageType.ManufacturerLogo,
    key: `${UploadUsageType.ManufacturerLogo}:${manufacturer.id}`,
    label: manufacturer.name,
    href: `/app/fleet/settings/manufacturer/${manufacturer.id}`,
  })),

  ...upload.eventCovers.map((event) => ({
    type: UploadUsageType.EventCover,
    key: `${UploadUsageType.EventCover}:${event.id}`,
    label: event.name,
    href: `/app/events/${event.id}`,
  })),

  ...upload.eventTemplateCovers.map((template) => ({
    type: UploadUsageType.EventTemplateCover,
    key: `${UploadUsageType.EventTemplateCover}:${template.id}`,
    label: template.name,
    href: getEventTemplatePath(template.id),
  })),

  ...upload.wikiPageIcons.map((page) => ({
    type: UploadUsageType.WikiPageIcon,
    key: `${UploadUsageType.WikiPageIcon}:${page.id}`,
    label: page.title,
    href: getWikiPageRouteHref(page),
  })),

  ...upload.wikiPageLinks.map(({ page }) => ({
    type: UploadUsageType.WikiPageAttachment,
    key: `${UploadUsageType.WikiPageAttachment}:${page.id}`,
    label: page.title,
    href: getWikiPageRouteHref(page),
  })),

  ...getSnapshotPages(upload.wikiPageSnapshotLinks).map((page) => ({
    type: UploadUsageType.WikiPageSnapshot,
    key: `${UploadUsageType.WikiPageSnapshot}:${page.id}`,
    label: page.title,
    href: getWikiPageSnapshotsRouteHref(page),
  })),
];
