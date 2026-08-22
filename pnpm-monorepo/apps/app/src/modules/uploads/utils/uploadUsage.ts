import { getEventTemplatePath } from "@/modules/event-templates/utils/eventTemplateConstraints";
import { getWikiPageRouteHref } from "@/modules/wiki/utils/wikiPageHref";

/**
 * Where an upload is referenced. `Unused` is not a usage but its absence —
 * it never comes out of `getUploadUsages`, only out of the usage filter and
 * the badge an upload without any reference gets.
 *
 * The real kinds are exactly the usage relations of the `Upload` model,
 * and exactly the relations the nightly cleanup lambda checks before
 * deleting an upload (see `deleteUnusedUploads`). `wikiReports` is
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
  readonly wikiPages: readonly WikiPageReference[];
}

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

  ...upload.wikiPages.map((page) => ({
    type: UploadUsageType.WikiPageAttachment,
    key: `${UploadUsageType.WikiPageAttachment}:${page.id}`,
    label: page.title,
    href: getWikiPageRouteHref(page),
  })),
];
